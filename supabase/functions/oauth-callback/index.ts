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
        tokenUrl: "https://oauth2.googleapis.com/token",
      };
    case "google_calendar":
      return {
        clientId: Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") || Deno.env.get("GMAIL_CLIENT_ID") || "",
        clientSecret: Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") || Deno.env.get("GMAIL_CLIENT_SECRET") || "",
        redirectUri,
        tokenUrl: "https://oauth2.googleapis.com/token",
      };
    case "outlook":
      return {
        clientId: Deno.env.get("OUTLOOK_CLIENT_ID") || "",
        clientSecret: Deno.env.get("OUTLOOK_CLIENT_SECRET") || "",
        redirectUri,
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
    case "outlook_calendar":
      return {
        clientId: Deno.env.get("OUTLOOK_CALENDAR_CLIENT_ID") || Deno.env.get("OUTLOOK_CLIENT_ID") || "",
        clientSecret: Deno.env.get("OUTLOOK_CALENDAR_CLIENT_SECRET") || Deno.env.get("OUTLOOK_CLIENT_SECRET") || "",
        redirectUri,
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
    default:
      throw new Error(`Provider não suportado: ${provider}`);
  }
}

async function exchangeCodeForToken(
  code: string,
  config: OAuthConfig,
  provider: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange error:", response.status, errorText);
    throw new Error(`Falha ao trocar código por token: ${response.status}`);
  }

  return await response.json();
}

async function getUserInfo(
  accessToken: string,
  provider: string
): Promise<{ email: string; name?: string }> {
  if (provider === "gmail" || provider === "google_calendar") {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Falha ao obter informações do usuário");
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
    };
  } else if (provider === "outlook" || provider === "outlook_calendar") {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Falha ao obter informações do usuário");
    }

    const data = await response.json();
    return {
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
    };
  }

  throw new Error(`Provider não suportado: ${provider}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const errorDescription = url.searchParams.get("error_description") || error;
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorDescription 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Código de autorização ou state não fornecido" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let stateData: { component_id: string; provider: string; user_id: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "State inválido" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { component_id, provider, user_id } = stateData;

    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Erro ao verificar usuário:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro ao verificar usuário" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const user = usersData?.users?.find((u) => u.id === user_id);
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuário não encontrado" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const referer = req.headers.get("referer");
    const origin = req.headers.get("origin");
    const frontendUrl = referer ? new URL(referer).origin : origin;
    
    const oauthConfig = getOAuthConfig(provider, supabaseUrl, frontendUrl || undefined);
    const tokenData = await exchangeCodeForToken(code, oauthConfig, provider);
    const userInfo = await getUserInfo(tokenData.access_token, provider);

    const configData = {
      oauth_provider: provider,
      oauth_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in: tokenData.expires_in || null,
      connected_email: userInfo.email,
      account_name: userInfo.name || userInfo.email,
      connected: true,
    };

    console.log("Salvando configuração OAuth:", { component_id, provider, email: userInfo.email });

    const { data: existingConfig, error: selectError } = await supabase
      .from("component_configurations")
      .select("id")
      .eq("component_id", component_id)
      .maybeSingle();

    if (selectError) {
      console.error("Erro ao verificar configuração existente:", selectError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: selectError.message 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (existingConfig) {
      console.log("Atualizando configuração existente:", existingConfig.id);
      const { error: updateError } = await supabase
        .from("component_configurations")
        .update({
          config: configData,
          updated_at: new Date().toISOString(),
        })
        .eq("component_id", component_id);

      if (updateError) {
        console.error("Erro ao atualizar configuração:", updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: updateError.message 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      console.log("Configuração atualizada com sucesso");
    } else {
      console.log("Criando nova configuração");
      const { error: insertError } = await supabase
        .from("component_configurations")
        .insert({
          component_id,
          config: configData,
        });

      if (insertError) {
        console.error("Erro ao inserir configuração:", insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: insertError.message 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      console.log("Configuração criada com sucesso");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        component_id,
        provider,
        email: userInfo.email 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("OAuth callback error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  /* CÓDIGO ORIGINAL COMENTADO PARA TESTE
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const errorDescription = url.searchParams.get("error_description") || error;
      const escapedError = String(errorDescription)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/á/g, "&#225;")
        .replace(/à/g, "&#224;")
        .replace(/ã/g, "&#227;")
        .replace(/â/g, "&#226;")
        .replace(/é/g, "&#233;")
        .replace(/ê/g, "&#234;")
        .replace(/í/g, "&#237;")
        .replace(/ó/g, "&#243;")
        .replace(/ô/g, "&#244;")
        .replace(/õ/g, "&#245;")
        .replace(/ú/g, "&#250;")
        .replace(/ü/g, "&#252;")
        .replace(/ç/g, "&#231;")
        .replace(/Á/g, "&#193;")
        .replace(/À/g, "&#192;")
        .replace(/Ã/g, "&#195;")
        .replace(/Â/g, "&#194;")
        .replace(/É/g, "&#201;")
        .replace(/Ê/g, "&#202;")
        .replace(/Í/g, "&#205;")
        .replace(/Ó/g, "&#211;")
        .replace(/Ô/g, "&#212;")
        .replace(/Õ/g, "&#213;")
        .replace(/Ú/g, "&#218;")
        .replace(/Ü/g, "&#220;")
        .replace(/Ç/g, "&#199;");
      
      const errorHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro na Conex&#227;o</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        background: rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 1rem;
        backdrop-filter: blur(10px);
        text-align: center;
        max-width: 500px;
      }
      h1 { margin-top: 0; }
      .error { color: #ff6b6b; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Erro na Conex&#227;o</h1>
      <p class="error">${escapedError}</p>
      <p>Voc&#234; pode fechar esta janela e tentar novamente.</p>
    </div>
  </body>
</html>`;

      const encoder = new TextEncoder();
      const htmlBytes = encoder.encode(errorHtml);
      
      return new Response(htmlBytes, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/html; charset=UTF-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        status: 200,
      });
    }

    if (!code || !state) {
      throw new Error("Código de autorização ou state não fornecido");
    }

    let stateData: { component_id: string; provider: string; user_id: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error("State inválido");
    }

    const { component_id, provider, user_id } = stateData;

    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Erro ao verificar usuário:", userError);
      throw new Error("Erro ao verificar usuário");
    }

    const user = usersData?.users?.find((u) => u.id === user_id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const oauthConfig = getOAuthConfig(provider, supabaseUrl);
    const tokenData = await exchangeCodeForToken(code, oauthConfig, provider);
    const userInfo = await getUserInfo(tokenData.access_token, provider);

    const configData = {
      oauth_provider: provider,
      oauth_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in: tokenData.expires_in || null,
      connected_email: userInfo.email,
      account_name: userInfo.name || userInfo.email,
      connected: true,
    };

    console.log("Salvando configuração OAuth:", { component_id, provider, email: userInfo.email });

    const { data: existingConfig, error: selectError } = await supabase
      .from("component_configurations")
      .select("id")
      .eq("component_id", component_id)
      .maybeSingle();

    if (selectError) {
      console.error("Erro ao verificar configuração existente:", selectError);
      throw selectError;
    }

    if (existingConfig) {
      console.log("Atualizando configuração existente:", existingConfig.id);
      const { error: updateError } = await supabase
        .from("component_configurations")
        .update({
          config: configData,
          updated_at: new Date().toISOString(),
        })
        .eq("component_id", component_id);

      if (updateError) {
        console.error("Erro ao atualizar configuração:", updateError);
        throw updateError;
      }
      console.log("Configuração atualizada com sucesso");
    } else {
      console.log("Criando nova configuração");
      const { error: insertError } = await supabase
        .from("component_configurations")
        .insert({
          component_id,
          config: configData,
        });

      if (insertError) {
        console.error("Erro ao inserir configuração:", insertError);
        throw insertError;
      }
      console.log("Configuração criada com sucesso");
    }

    const successHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conex&#227;o Bem-sucedida</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        background: rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 1rem;
        backdrop-filter: blur(10px);
        text-align: center;
        max-width: 500px;
      }
      h1 { margin-top: 0; }
      .success { color: #51cf66; }
      .checkmark {
        font-size: 4rem;
        margin-bottom: 1rem;
      }
      .debug {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
      }
    </style>
  </head>
  <body>
    <div class="debug" id="debug-info">Verificando renderiza&#231;&#227;o...</div>
    <div class="container">
      <div class="checkmark">&#10003;</div>
      <h1>Conex&#227;o Bem-sucedida!</h1>
      <p class="success">Sua conta foi conectada com sucesso.</p>
      <p>Esta janela ser&#225; fechada automaticamente...</p>
      <script>
        (function() {
          var debugEl = document.getElementById('debug-info');
          
          function updateDebug(message) {
            if (debugEl) {
              debugEl.textContent = 'DEBUG: ' + message;
              debugEl.style.background = '#51cf66';
            }
            console.log('OAuth Callback Debug:', message);
          }
          
          try {
            updateDebug('HTML renderizado corretamente');
            
            if (document.body && document.body.children.length > 0) {
              updateDebug('DOM carregado');
            } else {
              updateDebug('ERRO: DOM n&#227;o carregado');
            }
            
            if (window.opener && !window.opener.closed) {
              updateDebug('Enviando mensagem para opener');
              window.opener.postMessage({ 
                type: 'oauth-success',
                componentId: '${component_id}',
                provider: '${provider}'
              }, '*');
            } else {
              updateDebug('Aviso: window.opener n&#227;o dispon&#237;vel');
            }
            
            setTimeout(function() {
              try {
                updateDebug('Fechando janela...');
                window.close();
              } catch(e) {
                updateDebug('Erro ao fechar: ' + e.message);
                console.log('N&#227;o foi poss&#237;vel fechar a janela automaticamente. Por favor, feche manualmente.');
              }
            }, 2000);
            
            window.addEventListener('beforeunload', function() {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ 
                  type: 'oauth-success',
                  componentId: '${component_id}',
                  provider: '${provider}'
                }, '*');
              }
            });
          } catch(e) {
            updateDebug('ERRO: ' + e.message);
            console.error('Erro no script:', e);
          }
        })();
      </script>
    </div>
  </body>
</html>`;

    console.log("Retornando HTML de sucesso. Tamanho:", successHtml.length, "bytes");
    
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(successHtml);
    
    return new Response(htmlBytes, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/html; charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("OAuth callback error:", errorMessage);
    
    const escapedError = String(errorMessage)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/á/g, "&#225;")
      .replace(/à/g, "&#224;")
      .replace(/ã/g, "&#227;")
      .replace(/â/g, "&#226;")
      .replace(/é/g, "&#233;")
      .replace(/ê/g, "&#234;")
      .replace(/í/g, "&#237;")
      .replace(/ó/g, "&#243;")
      .replace(/ô/g, "&#244;")
      .replace(/õ/g, "&#245;")
      .replace(/ú/g, "&#250;")
      .replace(/ü/g, "&#252;")
      .replace(/ç/g, "&#231;")
      .replace(/Á/g, "&#193;")
      .replace(/À/g, "&#192;")
      .replace(/Ã/g, "&#195;")
      .replace(/Â/g, "&#194;")
      .replace(/É/g, "&#201;")
      .replace(/Ê/g, "&#202;")
      .replace(/Í/g, "&#205;")
      .replace(/Ó/g, "&#211;")
      .replace(/Ô/g, "&#212;")
      .replace(/Õ/g, "&#213;")
      .replace(/Ú/g, "&#218;")
      .replace(/Ü/g, "&#220;")
      .replace(/Ç/g, "&#199;");
    
    const errorHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro na Conex&#227;o</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        background: rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 1rem;
        backdrop-filter: blur(10px);
        text-align: center;
        max-width: 500px;
      }
      h1 { margin-top: 0; }
      .error { color: #ff6b6b; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Erro na Conex&#227;o</h1>
      <p class="error">${escapedError}</p>
      <p>Voc&#234; pode fechar esta janela e tentar novamente.</p>
    </div>
  </body>
</html>`;

    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(errorHtml);
    
    return new Response(htmlBytes, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/html; charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      status: 200,
    });
  }
  */
});

