import { CalendarEvent } from "./CalendarEventDomain";

interface ScheduledInteractionData {
  id: string;
  scheduled_at: string;
  leads?: {
    name?: string;
  };
}

export class ScheduledInteractionMapper {
  private readonly SCHEDULED_COLOR = "#10B981";
  private readonly DEFAULT_DURATION_MINUTES = 30;

  map(interaction: ScheduledInteractionData): CalendarEvent {
    const leadName = this.extractLeadName(interaction);
    const startDate = new Date(interaction.scheduled_at);
    const endDate = this.calculateEndDate(startDate);

    return {
      id: String(interaction.id || Math.random()),
      title: `Interação: ${leadName}`,
      start: startDate,
      end: endDate,
      description: String(`Interação agendada com ${leadName}`),
      location: "",
      attendees: [],
      source: "scheduled",
      color: this.SCHEDULED_COLOR,
    };
  }

  private extractLeadName(interaction: ScheduledInteractionData): string {
    const name = interaction.leads?.name;

    if (!name) {
      return "Lead";
    }

    return typeof name === "string" ? name : String(name);
  }

  private calculateEndDate(startDate: Date): Date {
    return new Date(
      startDate.getTime() + this.DEFAULT_DURATION_MINUTES * 60000
    );
  }
}

