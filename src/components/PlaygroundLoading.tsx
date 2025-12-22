import { useEffect, useState } from "react";
import { Bot, Sparkles, Zap, Brain } from "lucide-react";

interface PlaygroundLoadingProps {
  message?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

const COLORS = [
  "rgba(59, 130, 246, 0.6)",
  "rgba(56, 189, 248, 0.6)",
  "rgba(236, 72, 153, 0.6)",
  "rgba(139, 92, 246, 0.6)",
  "rgba(34, 197, 94, 0.6)",
];

const MESSAGES = [
  "Carregando agentes inteligentes...",
  "Preparando o playground...",
  "Conectando com a IA...",
  "Quase lá...",
];

export const PlaygroundLoading = ({
  message,
}: PlaygroundLoadingProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const particleCount = 50;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    setParticles(newParticles);

    const animateParticles = () => {
      setParticles((prev) =>
        prev.map((particle) => ({
          ...particle,
          x: (particle.x + particle.speedX + 100) % 100,
          y: (particle.y + particle.speedY + 100) % 100,
          opacity: 0.3 + Math.sin(Date.now() / 1000 + particle.id) * 0.3,
        }))
      );
    };

    const interval = setInterval(animateParticles, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % MESSAGES.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const increment = Math.random() * 3 + 1;
        return Math.min(prev + increment, 95);
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/5 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full blur-sm"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              transition: "opacity 0.1s ease-out",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-2xl opacity-50 animate-pulse" />
          <div className="relative bg-card/80 backdrop-blur-sm border border-primary/20 rounded-3xl p-12 shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-ping" />
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 border-4 border-primary/20 rounded-full animate-spin" />
                  <div
                    className="absolute w-24 h-24 border-4 border-transparent border-t-primary rounded-full animate-spin"
                    style={{ animationDuration: "1s" }}
                  />
                  <div className="relative bg-gradient-to-br from-primary to-secondary rounded-full p-6 shadow-lg">
                    <Bot className="w-12 h-12 text-primary-foreground animate-bounce" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <Zap className="w-5 h-5 text-secondary animate-pulse" style={{ animationDelay: "0.2s" }} />
                <Brain className="w-5 h-5 text-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
                  {message || MESSAGES[currentMessage]}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preparando tudo para você
                </p>
              </div>

              <div className="w-64 space-y-2">
                <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-secondary to-primary rounded-full transition-all duration-500 ease-out relative overflow-hidden shadow-lg"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/40 animate-shimmer" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-primary/80 to-transparent" />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground font-medium">
                  {Math.round(progress)}% concluído
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
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

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

