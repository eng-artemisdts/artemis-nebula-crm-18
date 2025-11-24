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
        // First, sign up the user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              selected_plan: selectedPlan,
              company_name: companyName,
              phone: phone,
            },
          },
        });

        if (signUpError) throw signUpError;

        // If logo is provided and user is created, upload it
        if (logo && signUpData.user) {
          try {
            const fileExt = logo.name.split('.').pop();
            const fileName = `${signUpData.user.id}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
              .from('organization-logos')
              .upload(filePath, logo, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Logo upload error:', uploadError);
              // Don't throw error, just log it - signup was successful
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('organization-logos')
                .getPublicUrl(filePath);

              // Update organization with logo URL
              const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', signUpData.user.id)
                .single();

              if (profile?.organization_id) {
                await supabase
                  .from('organizations')
                  .update({ logo_url: publicUrl })
                  .eq('id', profile.organization_id);
              }
            }
          } catch (logoError) {
            console.error('Error processing logo:', logoError);
            // Continue with signup even if logo upload fails
          }
        }

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
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/10 via-background to-cosmic-accent/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-glow-pulse" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-cosmic-glow/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cosmic-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Header Section with Animation */}
        <div className="text-center space-y-4 mb-8 animate-scale-in">
          <Link to="/" className="inline-block group">
            <img 
              src="/src/assets/logo.png" 
              alt="Artemis Nebula" 
              className="h-20 mx-auto transition-transform duration-300 group-hover:scale-110" 
            />
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              {isSignUp ? "Criar Conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isSignUp
                ? "Comece sua jornada conosco"
                : "Continue de onde parou"}
            </p>
          </div>
        </div>

        {/* Main Form Card with Glassmorphism */}
        <form 
          onSubmit={handleSubmit} 
          className="space-y-6 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl hover:shadow-primary/5 transition-all duration-300 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="space-y-5">
            {isSignUp && (
              <>
                {/* Plan Selection with Enhanced Design */}
                <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <Label className="text-base font-semibold">Escolha seu plano</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("free")}
                      disabled={isLoading}
                      className={cn(
                        "relative p-5 rounded-xl border-2 transition-all duration-300 text-left group hover:scale-105",
                        selectedPlan === "free"
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg">Gratuito</h3>
                        {selectedPlan === "free" && (
                          <Check className="h-6 w-6 text-primary animate-scale-in" />
                        )}
                      </div>
                      <p className="text-3xl font-bold mb-2 bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">R$ 0</p>
                      <p className="text-sm text-muted-foreground">7 dias de teste grátis</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro")}
                      disabled={isLoading}
                      className={cn(
                        "relative p-5 rounded-xl border-2 transition-all duration-300 text-left group hover:scale-105",
                        selectedPlan === "pro"
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg">Pro</h3>
                        {selectedPlan === "pro" && (
                          <Check className="h-6 w-6 text-primary animate-scale-in" />
                        )}
                      </div>
                      <p className="text-3xl font-bold mb-2 bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">R$ 99</p>
                      <p className="text-sm text-muted-foreground">por mês</p>
                    </button>
                  </div>
                </div>

                {/* Company Name Input */}
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <Label htmlFor="companyName" className="text-sm font-medium">Nome da Empresa *</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Minha Empresa Ltda"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 transition-all duration-300 focus:scale-[1.02]"
                  />
                </div>

                {/* Phone Input */}
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="h-12 transition-all duration-300 focus:scale-[1.02]"
                  />
                </div>

                {/* Logo Upload (Optional) */}
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <Label htmlFor="logo" className="text-sm font-medium">Logo da Empresa (Opcional)</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => setLogo(e.target.files?.[0] || null)}
                    disabled={isLoading}
                    className="h-12 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all duration-300"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                    PNG, JPG ou JPEG (máx. 2MB)
                  </p>
                </div>
              </>
            )}
            
            {/* Email Input */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: isSignUp ? '0.6s' : '0.2s' }}>
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 transition-all duration-300 focus:scale-[1.02]"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: isSignUp ? '0.7s' : '0.3s' }}>
              <Label htmlFor="password" className="text-sm font-medium">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 transition-all duration-300 focus:scale-[1.02]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20 animate-fade-in" 
            disabled={isLoading}
            style={{ animationDelay: isSignUp ? '0.8s' : '0.4s' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : isSignUp ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
          </Button>

          {/* Toggle Sign Up/Login */}
          <div className="text-center animate-fade-in" style={{ animationDelay: isSignUp ? '0.9s' : '0.5s' }}>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline font-medium transition-all duration-300 hover:scale-105 inline-block"
              disabled={isLoading}
            >
              {isSignUp
                ? "Já tem uma conta? Faça login"
                : "Não tem uma conta? Cadastre-se"}
            </button>
          </div>
        </form>

        {/* Dev Mode Helper */}
        {import.meta.env.DEV && (
          <div className="mt-6 text-center text-sm text-muted-foreground bg-muted/30 backdrop-blur-sm rounded-xl p-4 border border-border/30 animate-fade-in" style={{ animationDelay: '1s' }}>
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
    </div>
  );
};

export default Login;
