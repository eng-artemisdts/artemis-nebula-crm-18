import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

interface CalendarEvent {
  id: string;
  summary?: string;
  subject?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
  attendees?: Array<{
    email?: string;
    address?: string;
  }>;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { provider, start_date, end_date } = await req.json();

    if (!provider || !start_date || !end_date) {
      throw new Error("provider, start_date e end_date são obrigatórios");
    }

    const { data: componentData, error: componentError } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", provider === "google_calendar" ? "meeting_scheduler" : "meeting_scheduler")
      .single();

    if (componentError || !componentData) {
      throw new Error("Componente de agendamento não encontrado");
    }

    const { data: configData, error: configError } = await supabase
      .from("component_configurations")
      .select("config")
      .eq("component_id", componentData.id)
      .maybeSingle();

    if (configError || !configData?.config) {
      throw new Error("Configuração de calendário não encontrada");
    }

    const config = configData.config;
    if (!config.oauth_token || config.oauth_provider !== provider) {
      throw new Error("Calendário não conectado ou provider incorreto");
    }

    const accessToken = config.oauth_token;
    let events: CalendarEvent[] = [];

    if (provider === "google_calendar") {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.append("timeMin", start_date);
      url.searchParams.append("timeMax", end_date);
      url.searchParams.append("singleEvents", "true");
      url.searchParams.append("orderBy", "startTime");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar API error:", response.status, errorText);
        throw new Error(`Erro ao buscar eventos do Google Calendar: ${response.status}`);
      }

      const data = await response.json();
      events = data.items || [];
    } else if (provider === "outlook_calendar") {
      const url = new URL("https://graph.microsoft.com/v1.0/me/calendar/calendarView");
      url.searchParams.append("startDateTime", start_date);
      url.searchParams.append("endDateTime", end_date);
      url.searchParams.append("$orderby", "start/dateTime");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Outlook Calendar API error:", response.status, errorText);
        throw new Error(`Erro ao buscar eventos do Outlook Calendar: ${response.status}`);
      }

      const data = await response.json();
      events = data.value || [];
    } else {
      throw new Error(`Provider não suportado: ${provider}`);
    }

    return new Response(
      JSON.stringify({ events }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("get-calendar-events error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

