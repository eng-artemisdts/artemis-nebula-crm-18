import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      throw new Error("Componente de envio de email não encontrado");
    }

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

    const { data: configData, error: configError } = await supabase
      .from("component_configurations")
      .select("id, config")
      .eq("component_id", componentData.id)
      .maybeSingle();

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      throw new Error("Erro ao buscar configuração do email");
    }

    if (!configData?.config) {
      throw new Error("Email não conectado. Por favor, conecte sua conta de email na página de configuração.");
    }

    const config = configData.config;
    
    if (!config.oauth_token || !config.oauth_provider) {
      throw new Error("Token OAuth inválido ou provedor não configurado. Por favor, reconecte sua conta de email.");
    }

    console.log(`Enviando email para organização: ${requestData.organizationId}`);
    
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

    const targetUserEmail = authUser.user.email;
    if (!targetUserEmail) {
      throw new Error("Usuário não possui email cadastrado");
    }

    console.log(`Usuário alvo da organização: ${targetUserEmail}`);
    
    if (config.connected_email && config.connected_email !== targetUserEmail) {
      console.warn(`Aviso: Email conectado com conta diferente. Config: ${config.connected_email}, Target User: ${targetUserEmail}`);
    }

    let accessToken = config.oauth_token;
    const provider = config.oauth_provider;
    const refreshToken = config.refresh_token;

    let result: EmailResult;

    try {
      if (provider === "gmail") {
        result = await sendGmailEmail(accessToken, requestData, targetUserEmail);
      } else if (provider === "outlook") {
        result = await sendOutlookEmail(accessToken, requestData, targetUserEmail);
      } else {
        throw new Error(`Provedor não suportado: ${provider}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("401") && refreshToken && provider === "gmail") {
        console.log("Token expirado, renovando com refresh_token...");
        accessToken = await refreshGmailToken(refreshToken, configData.id, supabase);
        result = await sendGmailEmail(accessToken, requestData, targetUserEmail);
      } else if (errorMessage.includes("401") && refreshToken && provider === "outlook") {
        console.log("Token expirado, renovando com refresh_token...");
        accessToken = await refreshOutlookToken(refreshToken, configData.id, supabase);
        result = await sendOutlookEmail(accessToken, requestData, targetUserEmail);
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Outlook API error:", response.status, errorText);
    throw new Error(`Erro ao enviar email via Outlook: ${response.status}`);
  }

  return {
    messageId: `outlook-${Date.now()}`,
    success: true,
  };
}

