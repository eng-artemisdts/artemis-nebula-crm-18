import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Image as ImageIcon, Smartphone } from "lucide-react";

type WhatsAppInstance = {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: string;
};

type MessagePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  message: string;
  imageUrl?: string;
  leadName: string;
  isLoading: boolean;
  instances: WhatsAppInstance[];
  selectedInstanceName: string | null;
  onInstanceChange: (instanceName: string) => void;
};

export const MessagePreviewDialog = ({
  open,
  onOpenChange,
  onConfirm,
  message,
  imageUrl,
  leadName,
  isLoading,
  instances,
  selectedInstanceName,
  onInstanceChange
}: MessagePreviewDialogProps) => {
  useEffect(() => {
    if (open && instances.length === 1 && !selectedInstanceName) {
      onInstanceChange(instances[0].instance_name);
    }
  }, [open, instances, selectedInstanceName, onInstanceChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Preview da Mensagem
          </DialogTitle>
          <DialogDescription>
            Esta mensagem será enviada para <strong>{leadName}</strong> via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {instances.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="instance-select" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Selecionar Instância WhatsApp
              </Label>
              <Select
                value={selectedInstanceName || undefined}
                onValueChange={onInstanceChange}
              >
                <SelectTrigger id="instance-select">
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.instance_name}>
                      <div className="flex flex-col">
                        <span className="font-medium">{instance.instance_name}</span>
                        {instance.phone_number && (
                          <span className="text-xs text-muted-foreground">
                            {instance.phone_number}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedInstanceName && (
                <p className="text-xs text-destructive">
                  Por favor, selecione uma instância para continuar
                </p>
              )}
            </div>
          )}
          {imageUrl && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Imagem anexada:</span>
              </div>
              <img 
                src={imageUrl} 
                alt="Preview da imagem" 
                className="w-full max-h-64 object-contain rounded-md border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Mensagem de texto:</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message}
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-accent/10 p-3 rounded-md">
            <strong>Nota:</strong> A imagem será enviada primeiro, seguida pela mensagem de texto após 1,5 segundos.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={isLoading || (instances.length > 1 && !selectedInstanceName)}
          >
            {isLoading ? "Enviando..." : "Confirmar e Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
