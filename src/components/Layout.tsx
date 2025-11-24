import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Settings, List, LogOut, FolderKanban, SearchCheck, Bot, Smartphone, CreditCard, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NavLink } from "@/components/NavLink";
import { useOrganization } from "@/hooks/useOrganization";
import { PlanModal } from "@/components/PlanModal";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";

const menuItems = [
  { title: "Painel", url: "/dashboard", icon: Home },
  { title: "Todos os Leads", url: "/leads", icon: List },
  { title: "Buscar Leads", url: "/lead-search", icon: SearchCheck },
  { title: "Configurar IA Padrão", url: "/ai-configuration", icon: Sparkles },
  { title: "Interações com IA", url: "/ai-interaction", icon: Bot },
  { title: "Conectar WhatsApp", url: "/whatsapp", icon: Smartphone },
  { title: "Categorias", url: "/categories", icon: Users },
  { title: "Gerenciar Categorias", url: "/category-manager", icon: FolderKanban },
  { title: "Documentos", url: "/documents", icon: FileText },
  { title: "Configurações", url: "/settings", icon: Settings },
];

function AppSidebar() {
  const { state, open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const { organization } = useOrganization();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

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

  const isCollapsed = state === "collapsed";
  const displayLogo = organization?.logo_url || logo;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className={`border-b border-border bg-gradient-to-br from-primary/5 to-accent/5 transition-all ${isCollapsed ? 'p-2' : 'p-8'}`}>
          <NavLink to="/dashboard" className="block group">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img 
                src={displayLogo} 
                alt={organization?.company_name || "Logo"} 
                className={`relative z-10 transition-all duration-500 group-hover:scale-105 drop-shadow-2xl object-contain ${
                  isCollapsed ? 'w-10 h-10' : 'w-[200px] h-[200px]'
                }`}
              />
            </div>
          </NavLink>
          {!isCollapsed && organization?.company_name && (
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-foreground">{organization.company_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{organization.plan}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-secondary/50"
                      activeClassName="bg-primary text-primary-foreground shadow-lg"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Plan Section */}
        <div className="mt-auto p-4 border-t border-border space-y-3">
          {!isCollapsed && organization?.plan === "free" && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-3 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Plano Atual</span>
              </div>
              <p className="text-sm font-bold text-foreground capitalize mb-3">{organization?.plan}</p>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={() => setIsPlanModalOpen(true)}
              >
                Upgrade para Premium
              </Button>
            </div>
          )}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            className={`w-full gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${
              isCollapsed ? 'justify-center px-2' : 'justify-start'
            }`}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
      
      <PlanModal open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen} />
    </Sidebar>
  );
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4">
            <SidebarTrigger />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};
