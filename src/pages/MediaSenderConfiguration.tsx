import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Save,
  Trash2,
  Image as ImageIcon,
  Video,
  ArrowLeft,
  Plus,
  Loader2,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  fileName: string;
  usageDescription: string;
}

export default function MediaSenderConfiguration() {
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const componentRepository = new ComponentRepository();

  useEffect(() => {
    if (organization?.id) {
      loadMediaConfiguration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const loadMediaConfiguration = async () => {
    if (!organization?.id) return;

    try {
      const mediaComponent = await componentRepository.findByIdentifier(
        "media_sender"
      );
      if (!mediaComponent) {
        setMediaItems([]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("component_configurations")
        .select("config")
        .eq("component_id", mediaComponent.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.config && Array.isArray(data.config.mediaItems)) {
        setMediaItems(data.config.mediaItems);
      } else {
        setMediaItems([]);
      }
    } catch (error) {
      console.error("Error loading media configuration:", error);
      toast.error("Erro ao carregar configuração de mídia");
    }
  };

  const detectMediaType = (file: File): "image" | "video" | null => {
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];
    const validVideoTypes = ["video/mp4", "video/mov", "video/quicktime"];

    if (validImageTypes.includes(file.type)) {
      return "image";
    }
    if (validVideoTypes.includes(file.type)) {
      return "video";
    }
    return null;
  };

  const processFile = async (file: File) => {
    if (!organization?.id) return;

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      toast.error(
        "Tipo de arquivo não suportado. Use imagens (JPG, PNG, GIF) ou vídeos (MP4, MOV)."
      );
      return;
    }

    const MAX_FILE_SIZE =
      mediaType === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organization.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("media-sender")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media-sender").getPublicUrl(filePath);

      const newMediaItem: MediaItem = {
        id: `media-${Date.now()}`,
        type: mediaType,
        url: publicUrl,
        fileName: file.name,
        usageDescription: "",
      };

      setMediaItems([...mediaItems, newMediaItem]);
      toast.success("Mídia carregada com sucesso!");
    } catch (error) {
      console.error("Error uploading media:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao fazer upload da mídia. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
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
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    setDeletingMediaId(mediaId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMedia = async () => {
    if (!deletingMediaId || !organization?.id) return;

    try {
      const mediaToDelete = mediaItems.find((m) => m.id === deletingMediaId);
      if (!mediaToDelete) return;

      const urlParts = mediaToDelete.url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${organization.id}/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from("media-sender")
        .remove([filePath]);

      if (deleteError) {
        console.error("Error deleting file from storage:", deleteError);
      }

      setMediaItems(mediaItems.filter((m) => m.id !== deletingMediaId));
      toast.success("Mídia removida com sucesso!");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Erro ao remover mídia");
    } finally {
      setDeletingMediaId(null);
      setShowDeleteDialog(false);
    }
  };

  const handleUsageDescriptionChange = (
    mediaId: string,
    description: string
  ) => {
    setMediaItems(
      mediaItems.map((item) =>
        item.id === mediaId ? { ...item, usageDescription: description } : item
      )
    );
  };

  const handleSave = async () => {
    if (!organization?.id) {
      toast.error("Organização não encontrada");
      return;
    }

    setLoading(true);

    try {
      const mediaComponent = await componentRepository.findByIdentifier(
        "media_sender"
      );
      if (!mediaComponent) {
        throw new Error("Componente media_sender não encontrado");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("component_configurations")
        .upsert(
          {
            component_id: mediaComponent.id,
            config: {
              mediaItems: mediaItems,
            },
          },
          {
            onConflict: "component_id",
          }
        );

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving configuration:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao salvar configuração. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Configurar Envio de Mídia
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Configure imagens e vídeos que a IA deve enviar em ocasiões
                específicas. Qualquer agente com o componente de mídia ativo
                poderá utilizar estas mídias.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> As mídias configuradas aqui estarão
                disponíveis para todos os agentes que possuem o componente
                "Envio de Mídia" ativo. A IA decidirá qual mídia enviar em cada
                situação baseado nos contextos descritos.
              </p>
            </div>

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
                      ? "Enviando mídia..."
                      : "Arraste e solte imagens ou vídeos aqui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou use os botões abaixo para selecionar arquivos
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Adicionar Imagem</h4>
                      <p className="text-sm text-muted-foreground">
                        JPG, PNG ou GIF (máx. 10MB)
                      </p>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={(e) => handleFileUpload(e, "image")}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
              </Card>

              <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Adicionar Vídeo</h4>
                      <p className="text-sm text-muted-foreground">
                        MP4 ou MOV (máx. 50MB)
                      </p>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="video/mp4,video/mov,video/quicktime"
                    onChange={(e) => handleFileUpload(e, "video")}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
              </Card>
            </div>

            {uploading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Enviando mídia...
                </span>
              </div>
            )}

            {mediaItems.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Mídias Configuradas ({mediaItems.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mediaItems.map((media) => (
                      <Card key={media.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {media.type === "image" ? (
                                <ImageIcon className="w-5 h-5 text-primary" />
                              ) : (
                                <Video className="w-5 h-5 text-primary" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {media.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {media.type === "image" ? "Imagem" : "Vídeo"}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMedia(media.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {media.type === "image" && (
                            <div className="rounded-lg overflow-hidden border">
                              <img
                                src={media.url}
                                alt={media.fileName}
                                className="w-full h-48 object-cover"
                              />
                            </div>
                          )}

                          {media.type === "video" && (
                            <div className="rounded-lg overflow-hidden border bg-muted">
                              <video
                                src={media.url}
                                controls
                                className="w-full h-48"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor={`usage-${media.id}`}>
                              Quando a IA deve usar esta mídia?
                            </Label>
                            <Textarea
                              id={`usage-${media.id}`}
                              placeholder="Ex: Enviar quando o lead perguntar sobre produtos, quando demonstrar interesse em uma categoria específica, etc."
                              value={media.usageDescription}
                              onChange={(e) =>
                                handleUsageDescriptionChange(
                                  media.id,
                                  e.target.value
                                )
                              }
                              rows={3}
                              className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Descreva claramente em quais situações a IA deve
                              enviar esta mídia durante as conversas.
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mediaItems.length === 0 && !uploading && (
              <Card className="p-8 border-dashed">
                <div className="text-center space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhuma mídia configurada ainda. Adicione imagens ou vídeos
                    acima.
                  </p>
                </div>
              </Card>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={loading || uploading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta mídia? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMedia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
