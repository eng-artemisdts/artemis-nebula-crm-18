import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Rocket, Zap, Shield, TrendingUp } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/10 via-background to-cosmic-accent/10" />
        
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <img src="/src/assets/logo.png" alt="Artemis Nebula" className="h-16 hover-scale" />
            <Link to="/login">
              <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
                Entrar
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="mb-4 animate-scale-in">
              <img 
                src="/src/assets/logo.png" 
                alt="Artemis Nebula" 
                className="h-40 md:h-52 mx-auto hover-scale" 
              />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-fade-in">
              <span className="bg-gradient-to-r from-primary via-cosmic-glow to-cosmic-accent bg-clip-text text-transparent">
                CRM do Futuro
              </span>
              <br />
              <span className="text-foreground">para Seu Negócio</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
              Gerencie leads, automatize processos e impulsione suas vendas com inteligência e simplicidade.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
              <Link to="/login">
                <Button size="lg" className="text-lg px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover-scale">
                  Começar Agora
                  <Rocket className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-cosmic-surface/30">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-primary to-cosmic-accent bg-clip-text text-transparent animate-fade-in">
            Recursos Poderosos
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 hover-scale animate-fade-in opacity-0 [animation-delay:100ms] [animation-fill-mode:forwards]">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Gestão de Leads</h3>
              <p className="text-muted-foreground">
                Organize e acompanhe todos seus leads em um único lugar com kanban intuitivo.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 hover-scale animate-fade-in opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
              <div className="h-12 w-12 bg-cosmic-accent/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-cosmic-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Analytics em Tempo Real</h3>
              <p className="text-muted-foreground">
                Acompanhe métricas importantes e tome decisões baseadas em dados.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 hover-scale animate-fade-in opacity-0 [animation-delay:300ms] [animation-fill-mode:forwards]">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Integração Stripe</h3>
              <p className="text-muted-foreground">
                Crie links de pagamento diretamente do CRM e acompanhe status de pagamentos.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 hover-scale animate-fade-in opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
              <div className="h-12 w-12 bg-cosmic-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-cosmic-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Automação com n8n</h3>
              <p className="text-muted-foreground">
                Conecte-se ao n8n e automatize workflows complexos com facilidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-br from-primary/10 via-cosmic-glow/10 to-cosmic-accent/10 rounded-2xl p-12 border border-primary/20 animate-fade-in">
            <h2 className="text-4xl font-bold animate-slide-up">Pronto para Decolar?</h2>
            <p className="text-xl text-muted-foreground animate-fade-in opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
              Junte-se às empresas que já estão transformando suas vendas com Artemis Nebula.
            </p>
            <Link to="/login">
              <Button size="lg" className="text-lg px-8 shadow-lg shadow-primary/25 hover-scale animate-scale-in opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
                Começar Gratuitamente
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2025 Artemis Nebula. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
