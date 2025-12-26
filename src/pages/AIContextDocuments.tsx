import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { ygdrasilService } from "@/services/YgdrasilService";
import { pineconeIndexCacheService } from "@/services/cache/PineconeIndexCacheService";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

interface AIContextDocument {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  pinecone_index_name: string;
  pinecone_vector_count: number;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export default function AIContextDocuments() {
  const [documents, setDocuments] = useState<AIContextDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { organization } = useOrganization();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_context_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const validFiles = Array.from(files).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isValidType = ["pdf", "docx", "txt"].includes(extension || "");
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (!isValidType) {
        toast.error(
          `${file.name}: Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.`
        );
      } else if (!isValidSize) {
        toast.error(
          `${file.name}: Arquivo muito grande. Tamanho máximo: ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB`
        );
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) {
      return;
    }

    if (validFiles.length !== files.length) {
      toast.warning("Alguns arquivos foram ignorados");
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const indexName = generateIndexName(organization?.company_name);

      if (!pineconeIndexCacheService.isIndexCached(indexName)) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Usuário não autenticado");
          }

          const ensureIndexResponse = await fetch(
            `${
              import.meta.env.VITE_SUPABASE_URL
            }/functions/v1/ensure-pinecone-index`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                indexName,
                vectorDimension: 1024,
              }),
            }
          );

          if (!ensureIndexResponse.ok) {
            const errorData = await ensureIndexResponse.json();
            throw new Error(
              errorData.error || "Erro ao garantir existência do índice"
            );
          }

          pineconeIndexCacheService.cacheIndex(indexName);
        } catch (indexError) {
          console.error("Erro ao garantir índice:", indexError);
          toast.error(
            indexError instanceof Error
              ? indexError.message
              : "Erro ao criar índice no Pinecone"
          );
          setUploading(false);
          return;
        }
      }

      for (const file of validFiles) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
        const mimeType = file.type || getMimeTypeFromExtension(fileExtension);
        const fullFileName = file.name;

        let documentId: string | null = null;

        try {
          const { data: newDocument, error: insertError } = await supabase
            .from("ai_context_documents")
            .insert({
              user_id: user.id,
              file_name: fullFileName,
              file_size: file.size,
              file_type: mimeType,
              pinecone_index_name: indexName,
              pinecone_vector_count: 0,
              status: "processing",
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          documentId = newDocument.id;
        } catch (dbError) {
          console.error("Erro ao criar registro no banco:", dbError);
          toast.error("Erro ao criar registro do documento");
          continue;
        }

        try {
          const fileContent = await file.arrayBuffer();

          await ygdrasilService.uploadDocumentForRAG({
            fileName,
            fileExtension,
            mimeType,
            fileSize: file.size,
            fileContent,
            indexName,
            companyName: indexName,
            vectorDimension: 1024,
            embeddingModel: "text-embedding-3-small",
          });

          if (documentId) {
            await supabase
              .from("ai_context_documents")
              .update({
                status: "completed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", documentId);
          }

          toast.success(`${file.name} enviado para Ygdrasil com sucesso!`);
        } catch (uploadError) {
          console.error("Erro ao enviar para Ygdrasil:", uploadError);

          if (documentId) {
            await supabase
              .from("ai_context_documents")
              .update({
                status: "failed",
                error_message:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Erro desconhecido ao enviar para Ygdrasil",
                updated_at: new Date().toISOString(),
              })
              .eq("id", documentId);
          }

          throw uploadError;
        }
      }

      fetchDocuments();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar documentos"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    event.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este documento? Os vetores no Pinecone também serão removidos."
      )
    )
      return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/process-ai-context-document`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao deletar documento");
      }

      toast.success("Documento excluído com sucesso");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir documento"
      );
    }
  };

  const getMimeTypeFromExtension = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };
    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  };

  const generateIndexName = (
    companyName: string | null | undefined
  ): string => {
    if (!companyName) {
      return "default-index";
    }

    return companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Processado";
      case "failed":
        return "Falhou";
      case "processing":
        return "Processando";
      default:
        return "Desconhecido";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Documentação e Contexto da IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Anexe documentos que servirão como contexto para o modelo de IA. Os
            documentos serão processados e armazenados no Pinecone.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload de Documentos</CardTitle>
            <CardDescription>
              Formatos suportados: PDF, DOCX, TXT. Tamanho máximo: 10MB. Os
              documentos serão divididos em chunks, convertidos em embeddings e
              armazenados no Pinecone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 transition-all",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div
                  className={cn(
                    "p-4 rounded-full transition-colors",
                    isDragging
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {isDragging
                      ? "Solte os arquivos aqui"
                      : uploading
                      ? "Processando documentos..."
                      : "Arraste e solte arquivos aqui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou clique no botão abaixo para selecionar
                  </p>
                </div>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    disabled={uploading}
                    variant={isDragging ? "default" : "outline"}
                  >
                    <span className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Selecionar Documentos
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos: PDF, DOCX, TXT • Máximo: 10MB por arquivo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos de Contexto</CardTitle>
            <CardDescription>
              {documents.length} documento(s) no total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum documento de contexto adicionado ainda</p>
                <p className="text-sm mt-2">
                  Anexe documentos para fornecer contexto à IA
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{doc.file_name}</p>
                          {getStatusIcon(doc.status)}
                          <span className="text-sm text-muted-foreground">
                            {getStatusText(doc.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          {doc.status === "completed" && (
                            <>
                              <span>•</span>
                              <span>{doc.pinecone_vector_count} vetores</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(doc.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                        {doc.error_message && (
                          <p className="text-sm text-red-500 mt-1">
                            {doc.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={doc.status === "processing"}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
