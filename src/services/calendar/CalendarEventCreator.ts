import { supabase } from "@/integrations/supabase/client";

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
}

export interface CreateCalendarEventResponse {
  success: boolean;
  eventId?: string;
  eventUrl?: string;
  error?: string;
}

export class CalendarEventCreator {
  async createEvent(
    request: CreateCalendarEventRequest
  ): Promise<CreateCalendarEventResponse> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-calendar-event",
        {
          body: request,
        }
      );

      if (error) {
        throw error;
      }

      return {
        success: true,
        eventId: data?.eventId,
        eventUrl: data?.eventUrl,
      };
    } catch (error) {
      console.error("Erro ao criar evento no calendário:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }
}

