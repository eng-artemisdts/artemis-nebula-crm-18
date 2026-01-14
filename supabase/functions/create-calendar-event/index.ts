import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateEventRequest {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  organizationId?: string;
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

    const requestData: CreateEventRequest = await req.json();

    if (!requestData.organizationId) {
      throw new Error("organizationId é obrigatório");
    }

    if (!requestData.title || !requestData.startDateTime || !requestData.endDateTime) {
      throw new Error("title, startDateTime e endDateTime são obrigatórios");
    }

    const { data: componentData, error: componentError } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "meeting_scheduler")
      .single();

    if (componentError || !componentData) {
      throw new Error("Componente de agendamento não encontrado");
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
      .select("config")
      .eq("component_id", componentData.id)
      .maybeSingle();

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      throw new Error("Erro ao buscar configuração do calendário");
    }

    if (!configData?.config) {
      throw new Error("Calendário não conectado. Por favor, conecte seu calendário na página de configuração.");
    }

    const config = configData.config;
    
    if (!config.oauth_token || !config.oauth_provider) {
      throw new Error("Token OAuth inválido ou provedor não configurado. Por favor, reconecte seu calendário.");
    }

    console.log(`Agendando evento para organização: ${requestData.organizationId}`);
    
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
      console.warn(`Aviso: Calendário conectado com email diferente. Config: ${config.connected_email}, Target User: ${targetUserEmail}`);
    }

    const accessToken = config.oauth_token;
    const provider = config.oauth_provider;

    await validateAvailability(accessToken, provider, requestData);

    let result: { id: string; htmlLink?: string; webLink?: string };

    if (provider === "google_calendar") {
      result = await createGoogleCalendarEvent(accessToken, requestData);
    } else if (provider === "outlook_calendar") {
      result = await createOutlookCalendarEvent(accessToken, requestData);
    } else {
      throw new Error(`Provedor não suportado: ${provider}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId: result.id,
        eventUrl: result.htmlLink || result.webLink,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("create-calendar-event error:", errorMessage);
    
    const isConflict = errorMessage.includes("Conflito de horário");
    const statusCode = isConflict ? 409 : 500;
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});

async function validateAvailability(
  accessToken: string,
  provider: string,
  request: CreateEventRequest
): Promise<void> {
  const startDateTime = new Date(request.startDateTime);
  const endDateTime = new Date(request.endDateTime);

  if (startDateTime >= endDateTime) {
    throw new Error("A data/hora de início deve ser anterior à data/hora de fim");
  }

  let existingEvents: Array<{
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    summary?: string;
    subject?: string;
  }> = [];

  if (provider === "google_calendar") {
    existingEvents = await fetchGoogleCalendarEventsForValidation(
      accessToken,
      request.startDateTime,
      request.endDateTime
    );
  } else if (provider === "outlook_calendar") {
    existingEvents = await fetchOutlookCalendarEventsForValidation(
      accessToken,
      request.startDateTime,
      request.endDateTime
    );
  }

  const requestedStart = new Date(request.startDateTime);
  const requestedEnd = new Date(request.endDateTime);

  for (const event of existingEvents) {
    const eventStart = new Date(
      event.start?.dateTime || event.start?.date || ""
    );
    const eventEnd = new Date(event.end?.dateTime || event.end?.date || "");

    if (isTimeConflict(requestedStart, requestedEnd, eventStart, eventEnd)) {
      const eventTitle = event.summary || event.subject || "Evento";
      throw new Error(
        `Conflito de horário: Já existe um evento "${eventTitle}" no período solicitado`
      );
    }
  }
}

function isTimeConflict(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

async function fetchGoogleCalendarEventsForValidation(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<
  Array<{
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    summary?: string;
  }>
> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("timeMin", startDateTime);
  url.searchParams.append("timeMax", endDateTime);
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.warn("Erro ao buscar eventos para validação:", response.status);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

async function fetchOutlookCalendarEventsForValidation(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<
  Array<{
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    subject?: string;
  }>
> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendar/calendarView");
  url.searchParams.append("startDateTime", startDateTime);
  url.searchParams.append("endDateTime", endDateTime);
  url.searchParams.append("$orderby", "start/dateTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.warn("Erro ao buscar eventos para validação:", response.status);
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

async function createGoogleCalendarEvent(
  accessToken: string,
  request: CreateEventRequest
): Promise<{ id: string; htmlLink?: string }> {
  const event = {
    summary: request.title,
    description: request.description || "",
    start: {
      dateTime: request.startDateTime,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: request.endDateTime,
      timeZone: "America/Sao_Paulo",
    },
    location: request.location || "",
    attendees: request.attendees?.map((email) => ({ email })) || [],
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Calendar API error:", response.status, errorText);
    throw new Error(`Erro ao criar evento no Google Calendar: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
  };
}

async function createOutlookCalendarEvent(
  accessToken: string,
  request: CreateEventRequest
): Promise<{ id: string; webLink?: string }> {
  const event = {
    subject: request.title,
    body: {
      contentType: "HTML",
      content: request.description || "",
    },
    start: {
      dateTime: request.startDateTime,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: request.endDateTime,
      timeZone: "America/Sao_Paulo",
    },
    location: request.location
      ? {
          displayName: request.location,
        }
      : undefined,
    attendees: request.attendees?.map((email) => ({
      emailAddress: {
        address: email,
        name: email,
      },
      type: "required",
    })) || [],
  };

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendar/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Outlook Calendar API error:", response.status, errorText);
    throw new Error(`Erro ao criar evento no Outlook Calendar: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    webLink: data.webLink,
  };
}

