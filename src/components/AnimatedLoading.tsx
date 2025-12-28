import { useState, useEffect } from "react";
import { Loader2, Search, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedLoadingProps {
  className?: string;
}

const loadingMessages = [
  "Buscando negócios próximos...",
  "Analisando localizações...",
  "Encontrando leads com WhatsApp...",
  "Filtrando resultados...",
  "Quase lá! Processando dados...",
  "Buscando informações atualizadas...",
  "Verificando disponibilidade...",
];

export const AnimatedLoading = ({ className }: AnimatedLoadingProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  const currentMessage = loadingMessages[currentMessageIndex];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 space-y-6",
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 animate-ping" />
        </div>
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </div>
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -left-2">
          <MapPin className="w-5 h-5 text-primary animate-bounce" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <Search className="w-5 h-5 text-primary animate-pulse" />
          Buscando Leads
        </h3>
        <p className="text-sm text-muted-foreground min-h-[20px]">
          {currentMessage}
          <span className="inline-block w-4">{dots}</span>
        </p>
      </div>

      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    </div>
  );
};

