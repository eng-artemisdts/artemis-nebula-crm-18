import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Settings, List, LogOut, FolderKanban, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl rounded-full"></div>
                <img 
                  src={logo} 
                  alt="Artemis Nebula" 
                  className="h-12 relative z-10 transition-all duration-300 group-hover:scale-110 drop-shadow-lg" 
                />
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-1">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/dashboard")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Painel</span>
                </Link>
                <Link
                  to="/leads"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/leads")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Todos os Leads</span>
                </Link>
                <Link
                  to="/lead-search"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/lead-search")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <SearchCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Buscar Leads</span>
                </Link>
                <Link
                  to="/categories"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/categories")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Categorias</span>
                </Link>
                <Link
                  to="/category-manager"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/category-manager")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span className="hidden sm:inline">Gerenciar Categorias</span>
                </Link>
                <Link
                  to="/settings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive("/settings")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </Link>
              </nav>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground hover:text-destructive ml-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
