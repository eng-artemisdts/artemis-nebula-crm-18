import { Loader2 } from "lucide-react";

type LoadingOverlayProps = {
  message?: string;
};

export const LoadingOverlay = ({ message = "Carregando..." }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-card border rounded-lg p-8 shadow-lg animate-scale-in">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="absolute inset-0 w-12 h-12 animate-ping opacity-20">
              <Loader2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <p className="text-lg font-medium text-foreground animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
