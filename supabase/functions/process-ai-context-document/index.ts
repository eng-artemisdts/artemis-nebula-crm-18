import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pinecone } from "https://esm.sh/@pinecone-database/pinecone@6.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
};

interface DocumentChunk {
  text: string;
  metadata: {
    file_name: string;
    chunk_index: number;
    user_id: string;
    document_id: string;
  };
}

function* chunkTextGenerator(text: string, chunkSize: number = 800, overlap: number = 150): Generator<string, void, unknown> {
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      yield chunk;
    }
    start = end - overlap;
    if (start >= text.length) break;
  }
}

function countChunks(text: string, chunkSize: number = 800, overlap: number = 150): number {
  let count = 0;
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      count++;
    }
    start = end - overlap;
    if (start >= text.length) break;
  }

  return count;
}

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type || file.name.split('.').pop()?.toLowerCase();

  if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174');
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    
    const MAX_PAGES = 50;
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF muito grande. Máximo de ${MAX_PAGES} páginas permitidas. Este PDF tem ${pdf.numPages} páginas.`);
    }
    
    let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: { str: string }) => item.str).join(' ');
      text += pageText + '\n';
      
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return text;
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('https://esm.sh/mammoth@1.6.0');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
}

async function createEmbeddingsBatch(
  texts: string[], 
  openaiApiKey: string, 
  startIndex: number,
  batchSize: number = 20
): Promise<number[][]> {
  const batch = texts.slice(startIndex, startIndex + batchSize);
  
  if (batch.length === 0) {
    return [];
  }
  
  let retries = 3;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro ao criar embeddings: ${response.status} - ${error}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      const batchEmbeddings = data.data.map((item) => item.embedding);
      
      return batchEmbeddings;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retries--;
      
      if (retries > 0) {
        const delay = (4 - retries) * 1000;
        console.log(`Tentativa falhou, tentando novamente em ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  if (lastError) {
    throw lastError;
  }
  
  return [];
}

async function ensureIndexExists(
  pinecone: Pinecone,
  indexName: string
): Promise<void> {
  try {
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some((idx) => idx.name === indexName);

    if (!indexExists) {
      console.log(`Criando índice ${indexName}...`);
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });

      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const updatedIndexList = await pinecone.listIndexes();
        const nowExists = updatedIndexList.indexes?.some((idx) => idx.name === indexName);
        
        if (nowExists) {
          console.log(`Índice ${indexName} criado com sucesso`);
          return;
        }
        
        attempts++;
      }
      
      throw new Error(`Timeout ao aguardar criação do índice ${indexName}`);
    }
  } catch (error) {
    console.error('Erro ao verificar/criar índice:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const environment = Deno.env.get('ENVIRONMENT') || 'dev';

    if (!pineconeApiKey) {
      throw new Error('PINECONE_API_KEY não configurado');
    }

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurado');
    }

    if (req.method === 'DELETE') {
      const { documentId } = await req.json();

      if (!documentId) {
        throw new Error('Missing documentId');
      }

      const { data: document } = await supabase
        .from('ai_context_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single();

      if (!document) {
        throw new Error('Documento não encontrado');
      }

      const indexName = `${user.id}-${environment}`;
      const pinecone = new Pinecone({ apiKey: pineconeApiKey });
      const index = pinecone.index(indexName);

      try {
        await index.deleteMany({
          filter: {
            document_id: { $eq: documentId },
          },
        });
      } catch (error) {
        console.error('Erro ao deletar vetores do Pinecone:', error);
      }

      await supabase
        .from('ai_context_documents')
        .delete()
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ success: true, message: 'Documento deletado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('Nenhum arquivo fornecido');
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    console.log(`Arquivo recebido: ${file.name}, tipo: ${file.type}, tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    const indexName = `${user.id}-${environment}`;
    const documentId = crypto.randomUUID();

    const { data: initialDocument, error: initialError } = await supabase
      .from('ai_context_documents')
      .insert({
        id: documentId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || file.name.split('.').pop() || 'unknown',
        pinecone_index_name: indexName,
        pinecone_vector_count: 0,
        status: 'processing',
      })
      .select()
      .single();

    if (initialError) {
      console.error('Erro ao criar registro inicial:', initialError);
      throw initialError;
    }

    try {
      console.log(`Iniciando processamento do documento ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const pinecone = new Pinecone({ apiKey: pineconeApiKey });

      await ensureIndexExists(pinecone, indexName);

      const index = pinecone.index(indexName);

      console.log('Extraindo texto do arquivo...');
      let fileText: string;
      
      try {
        fileText = await extractTextFromFile(file);
        
        if (!fileText || fileText.trim().length === 0) {
          throw new Error('Nenhum texto extraído do documento');
        }

        console.log(`Texto extraído: ${fileText.length} caracteres`);
      } catch (extractError) {
        throw extractError;
      }
      
      const textChunks = chunkText(fileText, 800, 150);
      const MAX_CHUNKS = 150;
      
      if (textChunks.length > MAX_CHUNKS) {
        throw new Error(`Documento muito grande. Máximo de ${MAX_CHUNKS} chunks permitidos. Este documento geraria ${textChunks.length} chunks.`);
      }

      console.log(`Processando ${textChunks.length} chunks de forma incremental...`);
      
      fileText = '';

      const EMBEDDING_BATCH_SIZE = 8;
      let totalUploaded = 0;
      let chunkIndex = 0;

      while (chunkIndex < textChunks.length) {
        const batchStart = chunkIndex;
        const batchEnd = Math.min(chunkIndex + EMBEDDING_BATCH_SIZE, textChunks.length);
        const batchChunks = textChunks.slice(batchStart, batchEnd);
        
        console.log(`Criando embeddings para chunks ${batchStart + 1}-${batchEnd} de ${textChunks.length}...`);
        
        const batchEmbeddings = await createEmbeddingsBatch(
          textChunks,
          openaiApiKey,
          batchStart,
          EMBEDDING_BATCH_SIZE
        );

        if (batchEmbeddings.length === 0) {
          throw new Error(`Falha ao criar embeddings para o lote ${batchStart}-${batchEnd}`);
        }

        const batchVectors = batchEmbeddings.map((embedding, localIdx) => {
          const globalIdx = batchStart + localIdx;
          const chunkText = textChunks[globalIdx];
          return {
            id: `${documentId}-chunk-${globalIdx}`,
            values: embedding,
            metadata: {
              file_name: file.name,
              chunk_index: globalIdx,
              user_id: user.id,
              document_id: documentId,
              text: chunkText.substring(0, 300),
            },
          };
        });

        let retries = 3;
        let uploadSuccess = false;
        
        while (retries > 0 && !uploadSuccess) {
          try {
            await index.upsert(batchVectors);
            totalUploaded += batchVectors.length;
            console.log(`Upload: ${totalUploaded}/${textChunks.length} vetores`);
            uploadSuccess = true;
            
            if (chunkIndex + EMBEDDING_BATCH_SIZE < textChunks.length) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } catch (error) {
            retries--;
            if (retries === 0) {
              throw error;
            }
            console.log(`Erro no upload, tentando novamente... (${retries} tentativas restantes)`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        chunkIndex = batchEnd;
        
        batchChunks.length = 0;
        batchEmbeddings.length = 0;
        batchVectors.length = 0;
      }

      console.log(`Todos os vetores foram enviados. Atualizando status do documento...`);

      const { data: savedDocument, error: saveError } = await supabase
        .from('ai_context_documents')
        .update({
          pinecone_vector_count: totalUploaded,
          status: 'completed',
        })
        .eq('id', documentId)
        .select()
        .single();

      if (saveError) {
        console.error('Erro ao atualizar documento:', saveError);
        throw saveError;
      }

      console.log('Documento processado com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          document: savedDocument,
          message: 'Documento processado e enviado para o Pinecone com sucesso',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Erro no processamento:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await supabase
        .from('ai_context_documents')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', documentId);

      throw error;
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

