import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeChats = (raw: any[], instanceName: string) => {
  return raw.map((chat, index) => {
    const remoteJid = chat.remoteJid || chat.jid || chat.id || chat.number || chat.chatId || "";
    const lastMessage =
      chat.lastMessage?.text ||
      chat.lastMessage?.message ||
      chat.lastMessage?.body ||
      chat.previewMessage ||
      chat.message ||
      chat.messages?.[0]?.text ||
      "";
    const lastMessageAt =
      chat.lastMessage?.timestamp ||
      chat.lastMessageAt ||
      chat.timestamp ||
      chat.last_message_at ||
      chat.lastMessageTime ||
      Date.now();
    const unreadCount =
      asNumber(chat.unreadCount) ||
      asNumber(chat.unread) ||
      asNumber(chat.count) ||
      0;
    const name =
      chat.name ||
      chat.pushName ||
      chat.displayName ||
      chat.contactName ||
      chat.formattedTitle ||
      (remoteJid ? remoteJid.split("@")[0] : `Contato ${index + 1}`);

    return {
      id: chat.id || chat.remoteJid || chat.jid || chat.number || `${index}`,
      remoteJid,
      name,
      lastMessage,
      lastMessageAt,
      unreadCount,
      instanceName,
      phone: remoteJid ? remoteJid.split("@")[0] : "",
      leadId: chat.leadId || null,
      leadName: chat.leadName || null,
    };
  });
};

const fetchChatsFromEvolution = async (baseUrl: string, apiKey: string, instanceName: string) => {
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const endpoints: { url: string; method: "GET" | "POST"; body?: any }[] = [
    { url: `${cleanBase}/chat/findChats/${instanceName}`, method: "GET" },
    { url: `${cleanBase}/chat/getChats/${instanceName}`, method: "GET" },
    { url: `${cleanBase}/chat/chats/${instanceName}`, method: "GET" },
    { url: `${cleanBase}/chat/getChats/${instanceName}`, method: "POST", body: {} },
    { url: `${cleanBase}/chat/chats/${instanceName}`, method: "POST", body: {} },
    { url: `${cleanBase}/chat/findChats`, method: "POST", body: { instanceName } },
    { url: `${cleanBase}/chat/getChats`, method: "POST", body: { instanceName } },
    { url: `${cleanBase}/chat/chats`, method: "POST", body: { instanceName } },
    { url: `${cleanBase}/instance/chats/${instanceName}`, method: "GET" },
  ];

  const attempts: any[] = [];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });

    if (response.ok) {
      return await response.json();
    }

    const text = await response.text().catch(() => "");
    attempts.push({
      endpoint: endpoint.url,
      method: endpoint.method,
      status: response.status,
      body: text?.slice(0, 200),
    });
  }

  throw new Error(`Nenhum endpoint de chats retornou resultado: ${JSON.stringify(attempts)}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const requestedInstance = body?.instanceName as string | undefined;

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

    const chatsResponse = await fetchChatsFromEvolution(apiUrl, apiKey, targetInstance);
    const chatsArray = Array.isArray(chatsResponse)
      ? chatsResponse
      : chatsResponse?.data || chatsResponse?.chats || chatsResponse?.response || [];

    const normalizedChats = normalizeChats(chatsArray, targetInstance);
    const remoteJids = normalizedChats.map((chat) => chat.remoteJid).filter(Boolean);
    const phones = normalizedChats.map((chat) => chat.phone).filter(Boolean);

    if (remoteJids.length > 0 || phones.length > 0) {
      let leadsQuery = supabaseClient
        .from("leads")
        .select("id, name, remote_jid, contact_whatsapp, organization_id")
        .eq("organization_id", profile.organization_id);

      if (remoteJids.length > 0) {
        leadsQuery = leadsQuery.in("remote_jid", remoteJids);
      }

      if (phones.length > 0) {
        leadsQuery = leadsQuery.or(`contact_whatsapp.in.(${phones.join(",")})`);
      }

      const { data: leads } = await leadsQuery;

      if (leads && leads.length > 0) {
        normalizedChats.forEach((chat) => {
          const match = leads.find(
            (lead) =>
              lead.remote_jid === chat.remoteJid ||
              lead.contact_whatsapp === chat.phone
          );
          if (match) {
            chat.leadId = match.id;
            chat.leadName = match.name;
            chat.name = match.name || chat.name;
          }
        });
      }
    }

    return new Response(
      JSON.stringify({ chats: normalizedChats }),
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

