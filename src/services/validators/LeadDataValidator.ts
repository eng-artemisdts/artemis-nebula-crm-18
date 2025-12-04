import { cleanPhoneNumber } from "@/lib/utils";

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidatedLead {
  name: string;
  description?: string | null;
  category?: string | null;
  status: string;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  source?: string | null;
  integration_start_time?: string | null;
  payment_amount?: number | null;
}

export class LeadDataValidator {
  private readonly validStatuses = [
    "novo",
    "conversa_iniciada",
    "proposta_enviada",
    "link_pagamento_enviado",
    "pago",
    "perdido",
  ];

  validateRow(row: Record<string, any>, rowIndex: number): {
    lead: ValidatedLead | null;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const rowNumber = rowIndex + 2;

    const name = this.extractString(row, "nome", "name");
    if (!name || name.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "nome",
        message: "Nome é obrigatório",
      });
      return { lead: null, errors };
    }

    const status = this.extractString(row, "status", "status") || "novo";
    const normalizedStatus = status.toLowerCase();
    if (!this.validStatuses.includes(normalizedStatus)) {
      errors.push({
        row: rowNumber,
        field: "status",
        message: `Status inválido. Use: ${this.validStatuses.join(", ")}`,
      });
      return { lead: null, errors };
    }

    const email = this.extractString(row, "email", "contact_email", "e-mail");
    if (email && !this.isValidEmail(email)) {
      errors.push({
        row: rowNumber,
        field: "email",
        message: "Email inválido",
      });
    }

    const whatsapp = this.extractString(
      row,
      "whatsapp",
      "contact_whatsapp",
      "telefone",
      "phone"
    );
    let cleanedWhatsapp: string | null = null;
    if (whatsapp) {
      cleanedWhatsapp = cleanPhoneNumber(whatsapp);
      if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 13) {
        errors.push({
          row: rowNumber,
          field: "whatsapp",
          message: "Número de WhatsApp inválido",
        });
      }
    }

    const paymentAmount = this.extractNumber(row, "valor", "payment_amount", "preço", "price");
    if (paymentAmount !== null && paymentAmount < 0) {
      errors.push({
        row: rowNumber,
        field: "valor",
        message: "Valor não pode ser negativo",
      });
    }

    const integrationTime = this.extractString(
      row,
      "horario_integracao",
      "integration_start_time",
      "horário"
    );
    let formattedTime: string | null = null;
    if (integrationTime) {
      formattedTime = this.formatTime(integrationTime);
      if (!formattedTime) {
        errors.push({
          row: rowNumber,
          field: "horario_integracao",
          message: "Horário inválido. Use formato HH:MM (ex: 09:00)",
        });
      }
    }

    const lead: ValidatedLead = {
      name: name.trim(),
      description: this.extractString(row, "descricao", "description", "descrição") || null,
      category: this.extractString(row, "categoria", "category") || null,
      status: normalizedStatus,
      contact_email: email || null,
      contact_whatsapp: cleanedWhatsapp || null,
      source: this.extractString(row, "origem", "source") || null,
      integration_start_time: formattedTime,
      payment_amount: paymentAmount,
    };

    return { lead, errors };
  }

  private extractString(
    row: Record<string, any>,
    ...possibleKeys: string[]
  ): string | null {
    for (const key of possibleKeys) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return null;
  }

  private extractNumber(
    row: Record<string, any>,
    ...possibleKeys: string[]
  ): number | null {
    const value = this.extractString(row, ...possibleKeys);
    if (!value) return null;

    const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatTime(time: string): string | null {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = time.match(timeRegex);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
}

