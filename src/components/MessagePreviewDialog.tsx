import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Image as ImageIcon } from "lucide-react";

type MessagePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  message: string;
  imageUrl?: string;
  leadName: string;
  isLoading: boolean;
};

export const MessagePreviewDialog = ({
  open,
  onOpenChange,
  onConfirm,
  message,
  imageUrl,
  leadName,
  isLoading
}: MessagePreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Confirmar e Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
