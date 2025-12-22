import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

function getOAuthConfig(provider: string, supabaseUrl: string, frontendUrl?: string): OAuthConfig {
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const redirectUri = frontendUrl 
    ? `${frontendUrl}/oauth/callback`
    : `${baseUrl}/functions/v1/oauth-callback`;

  switch (provider) {
    case "gmail":
      return {
        clientId: Deno.env.get("GMAIL_CLIENT_ID") || "",
        clientSecret: Deno.env.get("GMAIL_CLIENT_SECRET") || "",
        redirectUri,
        scopes: [
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
      };
    case "google_calendar":
      return {
        clientId: Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") || Deno.env.get("GMAIL_CLIENT_ID") || "",
        clientSecret: Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") || Deno.env.get("GMAIL_CLIENT_SECRET") || "",
        redirectUri,
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
      };
    case "outlook":
      return {
        clientId: Deno.env.get("OUTLOOK_CLIENT_ID") || "",
        clientSecret: Deno.env.get("OUTLOOK_CLIENT_SECRET") || "",
        redirectUri,
        scopes: [
          "https://graph.microsoft.com/Mail.Send",
          "https://graph.microsoft.com/User.Read",
        ],
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
    case "outlook_calendar":
      return {
        clientId: Deno.env.get("OUTLOOK_CALENDAR_CLIENT_ID") || Deno.env.get("OUTLOOK_CLIENT_ID") || "",
        clientSecret: Deno.env.get("OUTLOOK_CALENDAR_CLIENT_SECRET") || Deno.env.get("OUTLOOK_CLIENT_SECRET") || "",
        redirectUri,
        scopes: [
          "https://graph.microsoft.com/Calendars.ReadWrite",
          "https://graph.microsoft.com/User.Read",
        ],
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
    default:
      throw new Error(`Provider não suportado: ${provider}`);
  }
}

function generateState(componentId: string, provider: string, userId: string): string {
  const stateData = {
    component_id: componentId,
    provider,
    user_id: userId,
    timestamp: Date.now(),
  };
  return btoa(JSON.stringify(stateData));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { component_id, provider, frontend_url } = await req.json();

    if (!component_id || !provider) {
      throw new Error("component_id e provider são obrigatórios");
    }

    const frontendUrl = frontend_url || req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/");
    const oauthConfig = getOAuthConfig(provider, supabaseUrl, frontendUrl);

    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      throw new Error(`Credenciais OAuth não configuradas para ${provider}. Configure as variáveis de ambiente necessárias.`);
    }

    console.log("OAuth Config:", {
      provider,
      redirectUri: oauthConfig.redirectUri,
      frontendUrl,
    });

    const state = generateState(component_id, provider, user.id);

    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
      response_type: "code",
      scope: oauthConfig.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });

    const authUrl = `${oauthConfig.authUrl}?${params.toString()}`;
    
    console.log("Generated OAuth URL with redirect_uri:", oauthConfig.redirectUri);

    return new Response(
      JSON.stringify({ auth_url: authUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("OAuth connect error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

