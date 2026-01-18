import { supabase } from "@/integrations/supabase/client";
import { IFileParser } from "./parsers/IFileParser";
import { CSVFileParser } from "./parsers/CSVFileParser";
import { XLSXFileParser } from "./parsers/XLSXFileParser";
import { LeadDataValidator, ValidatedLead, ValidationError } from "./validators/LeadDataValidator";
import { formatWhatsAppNumber } from "@/lib/utils";

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

    const { data: instancesData } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_name, status")
      .eq("organization_id", organizationId)
      .eq("status", "connected")
      .limit(1);

    const hasInstance = instancesData && instancesData.length > 0;
    const leadsWithWhatsApp = leads.filter((lead) => lead.contact_whatsapp);
    let validatedCount = 0;

    if (hasInstance && leadsWithWhatsApp.length > 0 && !skipWhatsAppValidation) {
      try {
        const phoneNumbers = leadsWithWhatsApp.map((lead) =>
          formatWhatsAppNumber(lead.contact_whatsapp!)
        );

        const { data: checkData, error: checkError } = await supabase.functions.invoke(
          "evolution-check-whatsapp",
          {
            body: { numbers: phoneNumbers },
          }
        );

        if (!checkError && checkData?.results) {
          const validationMap = new Map<string, { jid: string; exists: boolean }>();
          checkData.results.forEach((result: any, index: number) => {
            if (result.exists && result.jid) {
              validationMap.set(phoneNumbers[index], {
                jid: result.jid,
                exists: true,
              });
            }
          });

          leads.forEach((lead) => {
            if (lead.contact_whatsapp) {
              const formattedPhone = formatWhatsAppNumber(lead.contact_whatsapp);
              const validation = validationMap.get(formattedPhone);
              if (validation) {
                (lead as any).remote_jid = validation.jid;
                (lead as any).whatsapp_verified = true;
                validatedCount++;
              }
            }
          });
        }
      } catch (error) {
        console.error("Erro ao validar WhatsApps durante importação:", error);
      }
    }

    const leadsToInsert = leads.map((lead) => ({
      name: lead.name,
      description: lead.description || null,
      category: lead.category || null,
      status: lead.status,
      contact_email: lead.contact_email || null,
      contact_whatsapp: lead.contact_whatsapp ? formatWhatsAppNumber(lead.contact_whatsapp) : null,
      source: lead.source || null,
      integration_start_time: lead.integration_start_time
        ? `${lead.integration_start_time}:00+00`
        : null,
      payment_amount: lead.payment_amount || null,
      organization_id: organizationId,
      whatsapp_verified: (lead as any).whatsapp_verified || false,
      remote_jid: (lead as any).remote_jid || null,
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

      let message = `${imported} lead(s) importado(s) com sucesso`;
      
      if (validatedCount > 0) {
        message += `. ${validatedCount} lead(s) com WhatsApp validado automaticamente.`;
      } else if (leadsWithWhatsApp.length > 0 && !hasInstance) {
        message += ` ⚠️ Nenhuma instância WhatsApp conectada. Os leads com WhatsApp precisarão ser validados posteriormente.`;
      } else if (leadsWithWhatsApp.length > 0) {
        message += ` ⚠️ Alguns WhatsApps não puderam ser validados. Você pode validá-los posteriormente na lista de leads.`;
      }

      if (skipped > 0) {
        message += ` ${skipped} lead(s) ignorado(s).`;
      }

      return {
        success: true,
        totalRows,
        imported,
        errors,
        skipped,
        message,
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

