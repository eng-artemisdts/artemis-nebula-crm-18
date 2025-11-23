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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-80 bg-card border-r border-border flex flex-col fixed left-0 top-0 h-screen">
        {/* Logo */}
        <div className="p-8 border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
          <Link to="/dashboard" className="block group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img 
                src={logo} 
                alt="Artemis Nebula" 
                className="w-[200px] h-[200px] relative z-10 transition-all duration-500 group-hover:scale-105 drop-shadow-2xl object-contain" 
              />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/dashboard")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Painel</span>
            </Link>
            <Link
              to="/leads"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/leads")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <List className="w-5 h-5" />
              <span className="font-medium">Todos os Leads</span>
            </Link>
            <Link
              to="/lead-search"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/lead-search")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <SearchCheck className="w-5 h-5" />
              <span className="font-medium">Buscar Leads</span>
            </Link>
            <Link
              to="/categories"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/categories")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Categorias</span>
            </Link>
            <Link
              to="/category-manager"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/category-manager")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <FolderKanban className="w-5 h-5" />
              <span className="font-medium">Gerenciar Categorias</span>
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive("/settings")
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Configurações</span>
            </Link>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-80 p-8">{children}</main>
    </div>
  );
};
