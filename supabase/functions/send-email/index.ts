import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  organizationId: string;
  cc?: string[];
  bcc?: string[];
  attachments?: string[];
}

interface EmailResult {
  messageId: string;
  success: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
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

    const requestData: SendEmailRequest = await req.json();

    if (!requestData.organizationId) {
      throw new Error("organizationId é obrigatório");
    }

    if (!requestData.to || !requestData.subject || !requestData.body) {
      throw new Error("to, subject e body são obrigatórios");
    }

    if (!isValidEmail(requestData.to)) {
      throw new Error("Email do destinatário inválido");
    }

    const { data: componentData, error: componentError } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "email_sender")
      .single();

    if (componentError || !componentData) {
      console.error("❌ Componente email_sender não encontrado:", componentError);
      throw new Error("Componente de envio de email não encontrado");
    }

    console.log("📧 Componente email_sender encontrado:", componentData.id);

    const { data: orgComponentData, error: orgComponentError } = await supabase
      .from("organization_components")
      .select("organization_id")
      .eq("component_id", componentData.id)
      .eq("organization_id", requestData.organizationId)
      .maybeSingle();

    if (orgComponentError) {
      console.error("Erro ao buscar organização do componente:", orgComponentError);
      throw new Error("Erro ao buscar organização do componente");
    }

    if (!orgComponentData) {
      throw new Error("Componente não está disponível para esta organização");
    }

    // Buscar o usuário que está fazendo a requisição (se autenticado)
    const authHeader = req.headers.get("Authorization");
    let requestingUserId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (!userError && user) {
          requestingUserId = user.id;
          console.log("📧 Usuário autenticado fazendo requisição:", requestingUserId);
        }
      } catch (error) {
        console.log("⚠️ Não foi possível obter usuário da requisição, buscando qualquer configuração da organização");
      }
    }

    // Buscar configuração: primeiro do usuário que está fazendo a requisição, depois de qualquer usuário da organização
    let configData: any = null;
    let configError: any = null;

    if (requestingUserId) {
      const { data, error } = await supabase
        .from("component_configurations")
        .select("id, config, user_id")
        .eq("component_id", componentData.id)
        .eq("user_id", requestingUserId)
        .maybeSingle();
      
      configData = data;
      configError = error;
      
      if (data) {
        console.log("✅ Configuração encontrada para o usuário que está fazendo a requisição");
      }
    }

    // Se não encontrou configuração do usuário, busca de qualquer usuário da organização
    if (!configData) {
      console.log("🔍 Buscando configuração de qualquer usuário da organização");
      
      const { data: orgProfiles, error: orgProfilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", requestData.organizationId)
        .limit(10);

      if (!orgProfilesError && orgProfiles && orgProfiles.length > 0) {
        const userIds = orgProfiles.map(p => p.id);
        
        const { data, error } = await supabase
          .from("component_configurations")
          .select("id, config, user_id")
          .eq("component_id", componentData.id)
          .in("user_id", userIds)
          .limit(1)
          .maybeSingle();
        
        configData = data;
        configError = error;
        
        if (data) {
          console.log(`✅ Configuração encontrada para usuário ${data.user_id} da organização`);
        }
      }
    }

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      throw new Error("Erro ao buscar configuração do email");
    }

    if (!configData?.config) {
      console.error("❌ Configuração do componente email_sender não encontrada");
      console.error("💡 O componente email_sender precisa ser configurado separadamente do meeting_scheduler");
      throw new Error(`Email não conectado. Por favor, conecte sua conta de email na página de configuração. Acesse: /components/${componentData.id}/configure`);
    }

    const config = configData.config;
    
    console.log("📧 Configuração do email encontrada:", {
      hasOAuthToken: !!config.oauth_token,
      hasOAuthProvider: !!config.oauth_provider,
      provider: config.oauth_provider,
      connectedEmail: config.connected_email,
      connected: config.connected,
    });
    
    if (!config.oauth_token || !config.oauth_provider) {
      console.error("❌ Token OAuth ou provedor não configurado:", {
        hasOAuthToken: !!config.oauth_token,
        hasOAuthProvider: !!config.oauth_provider,
        configKeys: Object.keys(config),
        componentId: componentData.id,
      });
      console.error("💡 IMPORTANTE: email_sender e meeting_scheduler são componentes separados e precisam ser configurados independentemente");
      throw new Error(`Token OAuth inválido ou provedor não configurado. Por favor, reconecte sua conta de email. Acesse: /components/${componentData.id}/configure`);
    }

    console.log(`Enviando email para organização: ${requestData.organizationId}`);
    
    // Se temos a configuração, usar o email do usuário que tem a configuração
    let targetUserEmail: string | null = null;
    
    if (configData?.user_id) {
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(
        configData.user_id
      );

      if (!authUserError && authUser?.user?.email) {
        targetUserEmail = authUser.user.email;
        console.log(`📧 Usando email do usuário com configuração: ${targetUserEmail}`);
      }
    }

    // Se não encontrou, buscar de qualquer usuário da organização
    if (!targetUserEmail) {
      const { data: orgProfiles, error: orgProfilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", requestData.organizationId)
        .limit(1);

      if (orgProfilesError) {
        console.error("Erro ao buscar profiles:", orgProfilesError);
        throw new Error(`Erro ao buscar usuários da organização: ${orgProfilesError.message}`);
      }

      if (!orgProfiles || orgProfiles.length === 0) {
        console.error(`Nenhum profile encontrado para organização: ${requestData.organizationId}`);
        throw new Error("Nenhum usuário encontrado para esta organização");
      }

      const targetProfile = orgProfiles[0];
      console.log(`Profile encontrado: ${targetProfile.id}`);

      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(
        targetProfile.id
      );

      if (authUserError || !authUser?.user) {
        console.error("Erro ao buscar usuário do auth:", authUserError);
        throw new Error(`Erro ao buscar email do usuário: ${authUserError?.message || "Usuário não encontrado"}`);
      }

      targetUserEmail = authUser.user.email;
      if (!targetUserEmail) {
        throw new Error("Usuário não possui email cadastrado");
      }

      console.log(`Usuário alvo da organização: ${targetUserEmail}`);
    }
    
    if (config.connected_email && config.connected_email !== targetUserEmail) {
      console.warn(`Aviso: Email conectado com conta diferente. Config: ${config.connected_email}, Target User: ${targetUserEmail}`);
    }

    let accessToken = config.oauth_token;
    const provider = config.oauth_provider;
    const refreshToken = config.refresh_token;

    let result: EmailResult;

    try {
      console.log("📧 Iniciando envio de email:", {
        provider,
        to: requestData.to,
        subject: requestData.subject,
        fromEmail: targetUserEmail,
      });

      if (provider === "gmail") {
        result = await sendGmailEmail(accessToken, requestData, targetUserEmail);
      } else if (provider === "outlook") {
        result = await sendOutlookEmail(accessToken, requestData, targetUserEmail);
      } else {
        throw new Error(`Provedor não suportado: ${provider}`);
      }

      console.log("✅ Email enviado com sucesso:", {
        provider,
        messageId: result.messageId,
        to: requestData.to,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao enviar email:", {
        error: errorMessage,
        provider,
        hasRefreshToken: !!refreshToken,
        statusCode: errorMessage.includes("401") ? "401" : "outro",
      });
      
      if (errorMessage.includes("401") && refreshToken && provider === "gmail") {
        console.log("🔄 Token expirado, renovando com refresh_token...");
        try {
          accessToken = await refreshGmailToken(refreshToken, configData.id, supabase);
          result = await sendGmailEmail(accessToken, requestData, targetUserEmail);
        } catch (refreshError) {
          console.error("❌ Erro ao renovar token Gmail:", refreshError);
          throw new Error("Token OAuth expirado e não foi possível renovar. Por favor, reconecte sua conta de email na página de configuração.");
        }
      } else if (errorMessage.includes("401") && refreshToken && provider === "outlook") {
        console.log("🔄 Token expirado, renovando com refresh_token...");
        try {
          accessToken = await refreshOutlookToken(refreshToken, configData.id, supabase);
          result = await sendOutlookEmail(accessToken, requestData, targetUserEmail);
        } catch (refreshError) {
          console.error("❌ Erro ao renovar token Outlook:", refreshError);
          throw new Error("Token OAuth expirado e não foi possível renovar. Por favor, reconecte sua conta de email na página de configuração.");
        }
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        throw new Error("Token OAuth expirado ou sem permissão. Por favor, reconecte sua conta de email na página de configuração do componente 'email_sender'.");
      } else {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("send-email error:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !email.includes("@whatsapp") && !email.includes("@lid");
}

async function refreshGmailToken(
  refreshToken: string,
  configId: string,
  supabase: any
): Promise<string> {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais Gmail não configuradas");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro ao renovar token Gmail:", response.status, errorText);
    throw new Error(`Erro ao renovar token Gmail: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error("Token de acesso não recebido ao renovar");
  }

  const { data: currentConfig, error: selectError } = await supabase
    .from("component_configurations")
    .select("config")
    .eq("id", configId)
    .single();

  if (selectError) {
    console.error("Erro ao buscar config atual:", selectError);
  }

  const currentConfigData = currentConfig?.config || {};
  
  const { error: updateError } = await supabase
    .from("component_configurations")
    .update({
      config: {
        ...currentConfigData,
        oauth_provider: "gmail",
        oauth_token: data.access_token,
        refresh_token: refreshToken,
        expires_in: data.expires_in || null,
      },
    })
    .eq("id", configId);

  if (updateError) {
    console.error("Erro ao atualizar token:", updateError);
  }

  return data.access_token;
}

async function refreshOutlookToken(
  refreshToken: string,
  configId: string,
  supabase: any
): Promise<string> {
  const clientId = Deno.env.get("OUTLOOK_CLIENT_ID");
  const clientSecret = Deno.env.get("OUTLOOK_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais Outlook não configuradas");
  }

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro ao renovar token Outlook:", response.status, errorText);
    throw new Error(`Erro ao renovar token Outlook: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error("Token de acesso não recebido ao renovar");
  }

  const { data: currentConfig, error: selectError } = await supabase
    .from("component_configurations")
    .select("config")
    .eq("id", configId)
    .single();

  if (selectError) {
    console.error("Erro ao buscar config atual:", selectError);
  }

  const currentConfigData = currentConfig?.config || {};
  
  const { error: updateError } = await supabase
    .from("component_configurations")
    .update({
      config: {
        ...currentConfigData,
        oauth_provider: "outlook",
        oauth_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_in: data.expires_in || null,
      },
    })
    .eq("id", configId);

  if (updateError) {
    console.error("Erro ao atualizar token:", updateError);
  }

  return data.access_token;
}

async function sendGmailEmail(
  accessToken: string,
  request: SendEmailRequest,
  fromEmail: string
): Promise<EmailResult> {
  const emailLines: string[] = [];
  
  emailLines.push(`To: ${request.to}`);
  
    if (request.cc && request.cc.length > 0) {
      const validCc = request.cc.filter(email => isValidEmail(email));
      if (validCc.length > 0) {
        emailLines.push(`Cc: ${validCc.join(", ")}`);
      }
    }
  
    if (request.bcc && request.bcc.length > 0) {
      const validBcc = request.bcc.filter(email => isValidEmail(email));
      if (validBcc.length > 0) {
        emailLines.push(`Bcc: ${validBcc.join(", ")}`);
      }
    }
  
  emailLines.push(`Subject: ${request.subject}`);
  emailLines.push(`Content-Type: text/html; charset=utf-8`);
  emailLines.push("");
  emailLines.push(request.body);

  const rawMessage = emailLines.join("\n");
  const encodedMessage = btoa(rawMessage)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const message = {
    raw: encodedMessage,
  };

  const response = await fetch(
    "https://www.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gmail API error:", response.status, errorText);
    throw new Error(`Erro ao enviar email via Gmail: ${response.status}`);
  }

  const data = await response.json();
  return {
    messageId: data.id,
    success: true,
  };
}

async function sendOutlookEmail(
  accessToken: string,
  request: SendEmailRequest,
  fromEmail: string
): Promise<EmailResult> {
  console.log("📧 Enviando email via Outlook:", {
    to: request.to,
    subject: request.subject,
    fromEmail,
    hasCc: !!(request.cc && request.cc.length > 0),
    hasBcc: !!(request.bcc && request.bcc.length > 0),
  });

  const message = {
    message: {
      subject: request.subject,
      body: {
        contentType: "HTML",
        content: request.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: request.to,
          },
        },
      ],
      ccRecipients: request.cc?.filter(email => isValidEmail(email)).map((email) => ({
        emailAddress: {
          address: email,
        },
      })) || [],
      bccRecipients: request.bcc?.filter(email => isValidEmail(email)).map((email) => ({
        emailAddress: {
          address: email,
        },
      })) || [],
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  const responseText = await response.text();
  
  console.log("📧 Outlook API Response:", {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseText.substring(0, 500), // Primeiros 500 caracteres para não poluir logs
  });

  if (!response.ok) {
    console.error("❌ Outlook API error:", {
      status: response.status,
      statusText: response.statusText,
      error: responseText,
    });
    throw new Error(`Erro ao enviar email via Outlook: ${response.status} - ${responseText.substring(0, 200)}`);
  }

  // A API do Microsoft Graph retorna 202 (Accepted) quando o email é aceito para envio
  // ou 200 quando enviado imediatamente. Ambos são sucesso.
  if (response.status === 202 || response.status === 200 || response.status === 204) {
    console.log("✅ Email aceito pela API do Outlook");
    console.log("ℹ️ Status 202 significa que o email foi aceito para processamento.");
    console.log("ℹ️ O email será enviado em breve. Verifique:");
    console.log("   1. A caixa de saída (Sent Items) da conta Outlook conectada");
    console.log("   2. A pasta de spam do destinatário");
    console.log("   3. Aguarde alguns minutos - pode haver um pequeno atraso");
    
    // Tenta extrair o ID da mensagem se disponível
    let messageId = `outlook-${Date.now()}`;
    try {
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (parsed.id) {
          messageId = parsed.id;
        }
      }
    } catch {
      // Se não conseguir parsear, usa o ID gerado
    }

    // Log adicional com informações úteis
    console.log("📋 Informações do envio:", {
      messageId,
      to: request.to,
      subject: request.subject,
      fromEmail,
      requestId: response.headers.get("request-id"),
      clientRequestId: response.headers.get("client-request-id"),
      note: "Status 202 é normal - email aceito para processamento",
    });

    return {
      messageId,
      success: true,
    };
  }

  // Se chegou aqui, algo inesperado aconteceu
  console.error("⚠️ Resposta inesperada da API do Outlook:", {
    status: response.status,
    body: responseText,
  });
  
  throw new Error(`Resposta inesperada da API do Outlook: ${response.status}`);
}

