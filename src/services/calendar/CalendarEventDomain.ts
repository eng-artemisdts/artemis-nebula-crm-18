export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  source: "google" | "outlook" | "scheduled";
  color?: string;
}

export interface RawCalendarEvent {
  id?: string;
  summary?: string;
  subject?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  description?: string | { content?: string; text?: string };
  body?: string | { content?: string; text?: string };
  location?: string | LocationObject;
  attendees?: AttendeeData[];
}

interface LocationObject {
  displayName?: string;
  address?: string | AddressObject;
}

interface AddressObject {
  street?: string;
  city?: string;
  state?: string;
  countryOrRegion?: string;
}

type AttendeeData =
  | string
  | {
      email?: string;
      emailAddress?: { address?: string } | string;
      address?: string;
    };

export class LocationExtractor {
  static extract(location: string | LocationObject | undefined): string {
    if (!location) {
      return "";
    }

    if (typeof location === "string") {
      return location;
    }

    if (this.hasDisplayName(location)) {
      return location.displayName.trim();
    }

    if (location.address) {
      return this.extractAddress(location.address);
    }

    return "";
  }

  private static hasDisplayName(
    location: LocationObject
  ): location is LocationObject & { displayName: string } {
    return (
      typeof location.displayName === "string" &&
      location.displayName.trim().length > 0
    );
  }

  private static extractAddress(address: string | AddressObject): string {
    if (typeof address === "string") {
      return address;
    }

    const addressParts: string[] = [];

    if (address.street) addressParts.push(address.street);
    if (address.city) addressParts.push(address.city);
    if (address.state) addressParts.push(address.state);
    if (address.countryOrRegion) addressParts.push(address.countryOrRegion);

    return addressParts.join(", ");
  }
}

export class DescriptionExtractor {
  static extract(
    description?: string | { content?: string; text?: string },
    body?: string | { content?: string; text?: string }
  ): string {
    let rawText = "";

    if (description) {
      rawText = this.extractFromField(description);
    } else if (body) {
      rawText = this.extractFromField(body);
    }

    return this.stripHtml(rawText);
  }

  private static extractFromField(
    field: string | { content?: string; text?: string }
  ): string {
    if (typeof field === "string") {
      return field;
    }

    return field.content || field.text || "";
  }

  private static stripHtml(html: string): string {
    if (!html) {
      return "";
    }

    const htmlRegex = /<[^>]*>/g;
    const textOnly = html.replace(htmlRegex, "");

    const decodedText = textOnly
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "")
      .trim();

    return decodedText;
  }
}

export class AttendeesExtractor {
  static extract(attendees?: AttendeeData[]): string[] {
    if (!attendees || !Array.isArray(attendees)) {
      return [];
    }

    const emails: string[] = [];

    attendees.forEach((attendee) => {
      const email = this.extractEmail(attendee);
      if (email) {
        emails.push(email);
      }
    });

    return emails;
  }

  private static extractEmail(attendee: AttendeeData): string | null {
    if (typeof attendee === "string") {
      return attendee;
    }

    if (!attendee || typeof attendee !== "object") {
      return null;
    }

    const email =
      attendee.email ||
      (typeof attendee.emailAddress === "object"
        ? attendee.emailAddress?.address
        : attendee.emailAddress) ||
      attendee.address;

    return typeof email === "string" ? email : null;
  }
}

export class CalendarEventMapper {
  constructor(
    private readonly provider: "google" | "outlook",
    private readonly color: string
  ) {}

  map(rawEvent: RawCalendarEvent): CalendarEvent {
    return {
      id: String(rawEvent.id || Math.random()),
      title: this.extractTitle(rawEvent),
      start: this.extractStartDate(rawEvent),
      end: this.extractEndDate(rawEvent),
      description: DescriptionExtractor.extract(
        rawEvent.description,
        rawEvent.body
      ),
      location: LocationExtractor.extract(rawEvent.location),
      attendees: AttendeesExtractor.extract(rawEvent.attendees),
      source: this.provider,
      color: this.color,
    };
  }

  private extractTitle(rawEvent: RawCalendarEvent): string {
    return String(
      rawEvent.summary || rawEvent.subject || "Evento sem título"
    );
  }

  private extractStartDate(rawEvent: RawCalendarEvent): Date {
    if (!rawEvent.start) {
      return new Date();
    }

    if (typeof rawEvent.start === "string") {
      return new Date(rawEvent.start);
    }

    const startDate = rawEvent.start.dateTime || rawEvent.start.date;
    return startDate ? new Date(startDate) : new Date();
  }

  private extractEndDate(rawEvent: RawCalendarEvent): Date {
    if (!rawEvent.end) {
      return new Date();
    }

    if (typeof rawEvent.end === "string") {
      return new Date(rawEvent.end);
    }

    const endDate = rawEvent.end.dateTime || rawEvent.end.date;
    return endDate ? new Date(endDate) : new Date();
  }
}

