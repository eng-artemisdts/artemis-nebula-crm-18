import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Create admin user on first load
    const createAdminUser = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const data = await response.json();
        console.log('Admin user setup:', data.message);
      } catch (error) {
        console.log('Admin user setup skipped');
      }
    };

    createAdminUser();

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Upload logo if provided
        let logoUrl = null;
        if (logo) {
          const fileExt = logo.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('organization-logos')
            .upload(filePath, logo, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('organization-logos')
            .getPublicUrl(filePath);

          logoUrl = publicUrl;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              selected_plan: selectedPlan,
              company_name: companyName,
              cnpj: cnpj,
              phone: phone,
              logo_url: logoUrl,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada com sucesso!",
          description: "Você será redirecionado em instantes.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/5 via-background to-cosmic-accent/5" />
      
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block mb-6">
            <img src="/src/assets/logo.png" alt="Artemis Nebula" className="h-16 mx-auto" />
          </Link>
          <h1 className="text-3xl font-bold">
            {isSignUp ? "Criar Conta" : "Bem-vindo de volta"}
          </h1>
          <p className="text-muted-foreground">
            {isSignUp
              ? "Preencha os dados abaixo para criar sua conta"
              : "Entre com suas credenciais para continuar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border/50 rounded-lg p-8">
          <div className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-3">
                  <Label>Escolha seu plano</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("free")}
                      disabled={isLoading}
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all text-left",
                        selectedPlan === "free"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">Gratuito</h3>
                        {selectedPlan === "free" && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-1">R$ 0</p>
                      <p className="text-xs text-muted-foreground">7 dias de teste grátis</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro")}
                      disabled={isLoading}
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all text-left",
                        selectedPlan === "pro"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">Pro</h3>
                        {selectedPlan === "pro" && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-1">R$ 99</p>
                      <p className="text-xs text-muted-foreground">por mês</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Minha Empresa Ltda"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo da Empresa (PNG)</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => setLogo(e.target.files?.[0] || null)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PNG, JPG, JPEG (máx. 2MB)
                  </p>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isSignUp ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {isSignUp
                ? "Já tem uma conta? Faça login"
                : "Não tem uma conta? Cadastre-se"}
            </button>
          </div>
        </form>

        {import.meta.env.DEV && (
          <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border border-border/30">
            {!isSignUp ? (
              <>
                <p className="font-semibold mb-1">Primeiro acesso?</p>
                <p>Clique em "Não tem uma conta? Cadastre-se"</p>
                <p className="mt-2 text-xs">Use o email: admin@email.com e senha: 132566@</p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">Criar conta admin:</p>
                <p>Email: admin@email.com</p>
                <p>Senha: 132566@</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-glow-pulse -z-10" />
    </div>
  );
};

export default Login;
