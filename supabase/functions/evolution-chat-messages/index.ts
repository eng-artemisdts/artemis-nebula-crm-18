import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

const normalizeMessages = (raw: any[], instanceName: string, remoteJid: string) => {
  return raw.map((message, index) => {
    const id = message.id || message.key?.id || `${index}`;
    const content =
      message.text ||
      message.message?.conversation ||
      message.body ||
      message.content ||
      message.lastText ||
      "";
    const fromMe =
      message.fromMe ||
      message.key?.fromMe ||
      message.sender === "me" ||
      false;
    const timestamp =
      message.timestamp ||
      message.messageTimestamp ||
      message.createdAt ||
      Date.now();
    const type =
      message.type ||
      message.messageType ||
      (message.message?.imageMessage ? "image" : "text");

    return {
      id,
      content,
      fromMe,
      timestamp,
      type,
      instanceName,
      remoteJid,
    };
  });
};

const fetchMessagesFromEvolution = async (
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  remoteJid: string,
  limit: number
) => {
  const endpoints = [
    {
      url: `${baseUrl}/chat/getMessages/${instanceName}`,
      method: "POST",
      body: { remoteJid, limit },
    },
    {
      url: `${baseUrl}/chat/messages/${instanceName}`,
      method: "POST",
      body: { remoteJid, limit },
    },
    {
      url: `${baseUrl}/chat/messages/${instanceName}?remoteJid=${encodeURIComponent(remoteJid)}&limit=${limit}`,
      method: "GET",
    },
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });

    if (response.ok) {
      return await response.json();
    }
  }

  throw new Error("Nenhum endpoint de mensagens retornou resultado");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token ausente");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw userError;
    }

    const body = await req.json();
    const remoteJid = body?.remoteJid as string | undefined;
    const requestedInstance = body?.instanceName as string | undefined;
    const limit = body?.limit && typeof body.limit === "number" ? body.limit : 50;

    if (!remoteJid) {
      throw new Error("remoteJid é obrigatório");
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      throw new Error("Organização não encontrada para o usuário");
    }

    const instancesQuery = supabaseClient
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("organization_id", profile.organization_id)
      .eq("status", "connected")
      .order("created_at", { ascending: false });

    const { data: instances, error: instancesError } = await instancesQuery;
    if (instancesError) {
      throw instancesError;
    }

    if (!instances || instances.length === 0) {
      throw new Error("Nenhuma instância WhatsApp conectada");
    }

    const instanceNames = instances.map((i) => i.instance_name);
    const targetInstance = requestedInstance && instanceNames.includes(requestedInstance)
      ? requestedInstance
      : instanceNames[0];

    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apiUrl || !apiKey) {
      throw new Error("Credenciais da Evolution API não configuradas");
    }

    const messagesResponse = await fetchMessagesFromEvolution(
      apiUrl,
      apiKey,
      targetInstance,
      remoteJid,
      limit
    );

    const messagesArray = Array.isArray(messagesResponse)
      ? messagesResponse
      : messagesResponse?.messages || messagesResponse?.data || [];

    const normalizedMessages = normalizeMessages(messagesArray, targetInstance, remoteJid);

    return new Response(
      JSON.stringify({ messages: normalizedMessages }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

