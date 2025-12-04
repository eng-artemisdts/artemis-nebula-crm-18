import { supabase } from "@/integrations/supabase/client";
import { IFileParser } from "./parsers/IFileParser";
import { CSVFileParser } from "./parsers/CSVFileParser";
import { XLSXFileParser } from "./parsers/XLSXFileParser";
import { LeadDataValidator, ValidatedLead, ValidationError } from "./validators/LeadDataValidator";

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  errors: ValidationError[];
  skipped: number;
  message: string;
}

export class LeadImportService {
  private parser: IFileParser;
  private validator: LeadDataValidator;

  constructor(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv") {
      this.parser = new CSVFileParser();
    } else if (extension === "xlsx" || extension === "xls") {
      this.parser = new XLSXFileParser();
    } else {
      throw new Error("Formato de arquivo não suportado. Use CSV ou XLSX.");
    }
    this.validator = new LeadDataValidator();
  }

  async parseFile(file: File): Promise<{
    leads: ValidatedLead[];
    errors: ValidationError[];
  }> {
    const parseResult = await this.parser.parse(file);

    const leads: ValidatedLead[] = [];
    const allErrors: ValidationError[] = [];

    parseResult.data.forEach((row, index) => {
      const validation = this.validator.validateRow(row, index);
      if (validation.lead) {
        leads.push(validation.lead);
      }
      allErrors.push(...validation.errors);
    });

    return { leads, errors: allErrors };
  }

  async importLeads(
    leads: ValidatedLead[],
    organizationId: string,
    skipWhatsAppValidation: boolean = false
  ): Promise<ImportResult> {
    const totalRows = leads.length;
    const errors: ValidationError[] = [];
    let imported = 0;
    let skipped = 0;

    if (leads.length === 0) {
      return {
        success: false,
        totalRows: 0,
        imported: 0,
        errors: [{ row: 0, field: "geral", message: "Nenhum lead válido para importar" }],
        skipped: 0,
        message: "Nenhum lead válido encontrado no arquivo",
      };
    }

    const leadsToInsert = leads.map((lead) => ({
      name: lead.name,
      description: lead.description || null,
      category: lead.category || null,
      status: lead.status,
      contact_email: lead.contact_email || null,
      contact_whatsapp: lead.contact_whatsapp || null,
      source: lead.source || null,
      integration_start_time: lead.integration_start_time
        ? `${lead.integration_start_time}:00+00`
        : null,
      payment_amount: lead.payment_amount || null,
      organization_id: organizationId,
      whatsapp_verified: false,
      remote_jid: null,
      payment_status: "nao_criado",
    }));

    try {
      const { error, data } = await supabase
        .from("leads")
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error("Erro ao inserir leads:", error);
        throw error;
      }

      imported = data?.length || 0;
      skipped = totalRows - imported;

      if (imported === 0 && totalRows > 0) {
        return {
          success: false,
          totalRows,
          imported: 0,
          errors: [
            {
              row: 0,
              field: "geral",
              message: "Nenhum lead foi inserido. Verifique os dados e permissões.",
            },
          ],
          skipped: totalRows,
          message: "Nenhum lead foi importado. Verifique os logs para mais detalhes.",
        };
      }

      return {
        success: true,
        totalRows,
        imported,
        errors,
        skipped,
        message: `${imported} lead(s) importado(s) com sucesso${skipped > 0 ? `. ${skipped} lead(s) ignorado(s).` : "."}`,
      };
    } catch (error: any) {
      console.error("Erro detalhado na importação:", error);
      return {
        success: false,
        totalRows,
        imported: 0,
        errors: [
          {
            row: 0,
            field: "geral",
            message: error?.message || error?.details || "Erro ao importar leads",
          },
        ],
        skipped: 0,
        message: `Erro ao importar leads: ${error?.message || error?.details || "Erro desconhecido"}`,
      };
    }
  }
}

