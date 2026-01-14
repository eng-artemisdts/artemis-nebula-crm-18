import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pinecone } from "https://esm.sh/@pinecone-database/pinecone@6.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function ensureIndexExists(
  pinecone: Pinecone,
  indexName: string,
  dimension: number = 1024
): Promise<void> {
  try {
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some((idx) => idx.name === indexName);

    if (!indexExists) {
      console.log(`Criando índice ${indexName} com dimensão ${dimension}...`);
      await pinecone.createIndex({
        name: indexName,
        dimension: dimension,
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
    } else {
      console.log(`Índice ${indexName} já existe`);
    }
  } catch (error) {
    console.error('Erro ao verificar/criar índice:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    if (!pineconeApiKey) {
      throw new Error('PINECONE_API_KEY não configurado');
    }

    const { indexName, vectorDimension } = await req.json();

    if (!indexName) {
      throw new Error('indexName é obrigatório');
    }

    const dimension = vectorDimension || 1024;

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    await ensureIndexExists(pinecone, indexName, dimension);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Índice ${indexName} verificado/criado com sucesso`,
        indexName,
        dimension,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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





