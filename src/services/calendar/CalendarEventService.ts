import { supabase } from "@/integrations/supabase/client";
import {
  CalendarEvent,
  CalendarEventMapper,
  RawCalendarEvent,
} from "./CalendarEventDomain";

interface CalendarEventServiceConfig {
  startDate: Date;
  endDate: Date;
}

export class CalendarEventService {
  private readonly GOOGLE_COLOR = "#4285F4";
  private readonly OUTLOOK_COLOR = "#0078D4";

  async fetchEvents(
    provider: "google" | "outlook",
    config: CalendarEventServiceConfig
  ): Promise<CalendarEvent[]> {
    try {
      const normalizedProvider = this.normalizeProvider(provider);
      const response = await this.invokeEdgeFunction(
        normalizedProvider,
        config
      );

      if (!response.data?.events) {
        return [];
      }

      const mapper = this.createMapper(provider);
      return response.data.events.map((event: RawCalendarEvent) =>
        mapper.map(event)
      );
    } catch (error) {
      console.error("Erro ao buscar eventos do calendário:", error);
      throw error;
    }
  }

  private normalizeProvider(provider: "google" | "outlook"): string {
    const providerMap: Record<"google" | "outlook", string> = {
      google: "google_calendar",
      outlook: "outlook_calendar",
    };

    return providerMap[provider] || provider;
  }

  private async invokeEdgeFunction(
    provider: string,
    config: CalendarEventServiceConfig
  ) {
    const { data, error } = await supabase.functions.invoke(
      "get-calendar-events",
      {
        body: {
          provider,
          start_date: config.startDate.toISOString(),
          end_date: config.endDate.toISOString(),
        },
      }
    );

    if (error) {
      throw error;
    }

    return { data };
  }

  private createMapper(provider: "google" | "outlook"): CalendarEventMapper {
    const color =
      provider === "google" ? this.GOOGLE_COLOR : this.OUTLOOK_COLOR;

    return new CalendarEventMapper(provider, color);
  }
}

