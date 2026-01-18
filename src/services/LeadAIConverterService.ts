import * as XLSX from "xlsx";
import { ValidatedLead } from "./validators/LeadDataValidator";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
}

interface ConversionResult {
  leads: ValidatedLead[];
  mapping: FieldMapping[];
  errors: string[];
}

export class LeadAIConverterService {
  private openaiApiKey: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
    }
  }

  private isLocalEnvironment(): boolean {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  }

  async convertSpreadsheet(file: File): Promise<ConversionResult> {
    if (!this.isLocalEnvironment()) {
      throw new Error("Esta funcionalidade está disponível apenas em ambiente local");
    }

    if (!this.openaiApiKey) {
      throw new Error("OPENAI_API_KEY não configurada. Configure VITE_OPENAI_API_KEY no arquivo .env.local");
    }

    const workbook = await this.readFile(file);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Arquivo não contém planilhas");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      raw: false,
      defval: null,
    });

    if (jsonData.length === 0) {
      throw new Error("Planilha está vazia");
    }

    const headers = Object.keys(jsonData[0]);
    const sampleRows = jsonData.slice(0, 5);

    const mapping = await this.generateFieldMapping(headers, sampleRows);
    const leads = this.convertData(jsonData, mapping);

    return {
      leads,
      mapping,
      errors: [],
    };
  }

  private async readFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("Erro ao ler arquivo"));
            return;
          }

          let workbook: XLSX.WorkBook;
          if (data instanceof ArrayBuffer) {
            workbook = XLSX.read(data, { type: "array" });
          } else {
            workbook = XLSX.read(data, { type: "binary" });
          }

          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsArrayBuffer(file);
    });
  }

  private async generateFieldMapping(
    headers: string[],
    sampleRows: Record<string, any>[]
  ): Promise<FieldMapping[]> {
    const expectedFields = [
      { name: "nome", aliases: ["nome", "name", "cliente", "contato", "pessoa"] },
      { name: "email", aliases: ["email", "e-mail", "contact_email", "correio"] },
      {
        name: "whatsapp",
        aliases: ["whatsapp", "telefone", "phone", "contact_whatsapp", "celular", "mobile"],
      },
      { name: "status", aliases: ["status", "situação", "estado"] },
      { name: "categoria", aliases: ["categoria", "category", "tipo", "classificação"] },
      { name: "origem", aliases: ["origem", "source", "fonte", "procedência"] },
      { name: "descricao", aliases: ["descricao", "description", "descrição", "observações", "obs"] },
      { name: "valor", aliases: ["valor", "payment_amount", "preço", "price", "montante"] },
      {
        name: "horario_integracao",
        aliases: ["horario_integracao", "integration_start_time", "horário", "hora"],
      },
    ];

    const headersJson = JSON.stringify(headers);
    const sampleDataJson = JSON.stringify(sampleRows, null, 2);
    const expectedFieldsJson = JSON.stringify(expectedFields);

    const prompt = `Você é um assistente especializado em mapear campos de planilhas para um formato específico.

Cabeçalhos da planilha:
${headersJson}

Exemplo de dados (primeiras 5 linhas):
${sampleDataJson}

Campos esperados e seus possíveis nomes:
${expectedFieldsJson}

Analise os cabeçalhos da planilha e mapeie cada um para o campo correspondente do formato esperado.
Para cada cabeçalho, retorne um objeto JSON com:
- sourceField: o nome exato do cabeçalho na planilha (case-sensitive)
- targetField: o nome do campo no formato esperado (um dos: nome, email, whatsapp, status, categoria, origem, descricao, valor, horario_integracao)
- confidence: um número de 0 a 1 indicando a confiança do mapeamento

IMPORTANTE: 
- Retorne APENAS um array JSON válido, sem markdown, sem explicações, sem código blocks, sem texto adicional
- Use os nomes EXATOS dos cabeçalhos como aparecem na planilha (case-sensitive)
- Se "Nome" existir, mapeie para "nome" com alta confiança
- Se "Razão" ou "Razao" existir e não houver "Nome", mapeie para "nome" 
- Se "Fantasia" existir e não houver "Nome" nem "Razão", mapeie para "nome"
- Se "E-mail" ou "E-mail" existir, mapeie para "email"
- Se "Whatsapp" ou "WhatsApp" existir, mapeie para "whatsapp"
- Campos como "CNPJ", "Cidade" não devem ser mapeados (não estão na lista de campos esperados)

Formato de resposta (APENAS o JSON, sem formatação adicional):
[{"sourceField":"Nome","targetField":"nome","confidence":0.95},{"sourceField":"E-mail","targetField":"email","confidence":0.9},{"sourceField":"Whatsapp","targetField":"whatsapp","confidence":0.95}]

Se um cabeçalho não corresponder a nenhum campo esperado, não o inclua no array.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em mapear campos de planilhas. Sempre retorne apenas JSON válido, sem explicações ou formatação adicional.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Erro na API OpenAI (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error.code || errorMessage;
            if (errorData.error.code === "invalid_api_key") {
              errorMessage = "Chave da API OpenAI inválida. Verifique VITE_OPENAI_API_KEY no .env.local";
            } else if (errorData.error.code === "insufficient_quota") {
              errorMessage = "Cota da API OpenAI esgotada. Verifique seu plano e créditos.";
            } else if (errorData.error.code === "rate_limit_exceeded") {
              errorMessage = "Limite de requisições excedido. Aguarde um momento e tente novamente.";
            }
          }
        } catch {
          errorMessage = response.statusText || `Erro HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error("Resposta inválida da API OpenAI");
      }

      const content = data.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error("Resposta vazia da API OpenAI");
      }

      let mapping: FieldMapping[] = [];

      try {
        let jsonString = content.trim();
        
        jsonString = jsonString.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/g, "").trim();
        
        const jsonMatch = jsonString.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        try {
          mapping = JSON.parse(jsonString);
        } catch (parseError: any) {
          console.error("Erro ao fazer parse do JSON:", parseError);
          console.error("Conteúdo recebido:", content);
          console.error("JSON extraído:", jsonString);
          
          const firstBracket = jsonString.indexOf("[");
          const lastBracket = jsonString.lastIndexOf("]");
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const extracted = jsonString.substring(firstBracket, lastBracket + 1);
            try {
              mapping = JSON.parse(extracted);
            } catch {
              throw new Error(`Não foi possível fazer parse do JSON. Erro: ${parseError.message}`);
            }
          } else {
            throw new Error(`Não foi possível extrair JSON válido da resposta. Conteúdo: ${content.substring(0, 300)}`);
          }
        }
      } catch (parseError: any) {
        console.error("Erro ao processar resposta da IA:", parseError);
        throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
      }

      if (!Array.isArray(mapping)) {
        throw new Error("Resposta da IA não é um array válido");
      }

      const validMapping = mapping.filter(
        (m) =>
          m &&
          typeof m === "object" &&
          m.sourceField &&
          m.targetField &&
          typeof m.confidence === "number" &&
          m.confidence >= 0.5
      );

      if (validMapping.length === 0) {
        console.warn("Nenhum mapeamento válido retornado pela IA, tentando fallback");
        const fallback = this.fallbackMapping(headers);
        if (fallback.length > 0) {
          console.info("Usando mapeamento fallback:", fallback);
          return fallback;
        }
        throw new Error("Não foi possível mapear nenhum campo da planilha");
      }

      return validMapping;
    } catch (error: any) {
      console.error("Erro ao gerar mapeamento com IA:", error);
      
      if (error.message.includes("API OpenAI") || error.message.includes("Chave da API")) {
        throw error;
      }
      
      if (error.message.includes("Não foi possível mapear")) {
        throw error;
      }
      
      console.warn("Tentando usar mapeamento fallback após erro da IA");
      try {
        const fallback = this.fallbackMapping(headers);
        if (fallback.length > 0) {
          console.info("Usando mapeamento fallback após erro:", fallback);
          return fallback;
        }
      } catch (fallbackError) {
        console.error("Erro no fallback também:", fallbackError);
      }
      
      throw new Error(`Erro ao processar com IA: ${error.message || "Erro desconhecido"}`);
    }
  }

  private fallbackMapping(headers: string[]): FieldMapping[] {
    const mapping: FieldMapping[] = [];
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase();
      let targetField: string | null = null;
      let confidence = 0.7;

      if (
        lowerHeader === "nome" ||
        lowerHeader === "name" ||
        lowerHeader === "razão" ||
        lowerHeader === "razao" ||
        lowerHeader === "fantasia"
      ) {
        targetField = "nome";
        confidence = 0.9;
      } else if (
        lowerHeader === "email" ||
        lowerHeader === "e-mail" ||
        lowerHeader === "correio"
      ) {
        targetField = "email";
        confidence = 0.9;
      } else if (
        lowerHeader === "whatsapp" ||
        lowerHeader === "telefone" ||
        lowerHeader === "phone" ||
        lowerHeader === "celular" ||
        lowerHeader === "mobile"
      ) {
        targetField = "whatsapp";
        confidence = 0.9;
      } else if (lowerHeader === "status" || lowerHeader === "situação") {
        targetField = "status";
        confidence = 0.8;
      } else if (
        lowerHeader === "categoria" ||
        lowerHeader === "category" ||
        lowerHeader === "tipo"
      ) {
        targetField = "categoria";
        confidence = 0.8;
      } else if (
        lowerHeader === "origem" ||
        lowerHeader === "source" ||
        lowerHeader === "fonte"
      ) {
        targetField = "origem";
        confidence = 0.8;
      } else if (
        lowerHeader === "descricao" ||
        lowerHeader === "description" ||
        lowerHeader === "descrição" ||
        lowerHeader === "observações" ||
        lowerHeader === "obs"
      ) {
        targetField = "descricao";
        confidence = 0.7;
      } else if (
        lowerHeader === "valor" ||
        lowerHeader === "preço" ||
        lowerHeader === "price" ||
        lowerHeader === "montante"
      ) {
        targetField = "valor";
        confidence = 0.8;
      } else if (
        lowerHeader === "horario_integracao" ||
        lowerHeader === "horário" ||
        lowerHeader === "hora" ||
        lowerHeader === "integration_start_time"
      ) {
        targetField = "horario_integracao";
        confidence = 0.7;
      }

      if (targetField) {
        mapping.push({
          sourceField: header,
          targetField,
          confidence,
        });
      }
    });

    return mapping;
  }

  private convertData(
    data: Record<string, any>[],
    mapping: FieldMapping[]
  ): ValidatedLead[] {
    const leads: ValidatedLead[] = [];

    data.forEach((row, index) => {
      const lead: any = {
        status: "novo",
      };

      mapping.forEach((map) => {
        const value = row[map.sourceField];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          const stringValue = String(value).trim();

          switch (map.targetField) {
            case "nome":
              const nameValue = stringValue.replace(/-$/, "").trim();
              if (nameValue) {
                lead.name = nameValue;
              }
              break;
            case "email":
              lead.contact_email = stringValue;
              break;
            case "whatsapp":
              let whatsappValue = stringValue;
              if (stringValue.includes("E+") || stringValue.includes("e+")) {
                try {
                  const numValue = parseFloat(stringValue);
                  if (!isNaN(numValue)) {
                    whatsappValue = numValue.toFixed(0);
                  }
                } catch {
                  whatsappValue = stringValue;
                }
              }
              whatsappValue = whatsappValue.replace(/\D/g, "");
              if (whatsappValue.length >= 10 && whatsappValue.length <= 15) {
                lead.contact_whatsapp = whatsappValue;
              }
              break;
            case "status":
              lead.status = stringValue.toLowerCase();
              break;
            case "categoria":
              lead.category = stringValue;
              break;
            case "origem":
              lead.source = stringValue;
              break;
            case "descricao":
              lead.description = stringValue;
              break;
            case "valor":
              const numValue = parseFloat(
                stringValue.replace(/[^\d,.-]/g, "").replace(",", ".")
              );
              if (!isNaN(numValue) && numValue >= 0) {
                lead.payment_amount = numValue;
              }
              break;
            case "horario_integracao":
              const timeMatch = stringValue.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                const hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                  lead.integration_start_time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
                }
              }
              break;
          }
        }
      });

      if (!lead.name) {
        const nomeMapping = mapping.find((m) => m.targetField === "nome");
        if (nomeMapping) {
          const nomeValue = data[index][nomeMapping.sourceField];
          if (nomeValue) {
            lead.name = String(nomeValue).trim().replace(/-$/, "");
          }
        }
        
        if (!lead.name) {
          const razaoValue = data[index]["Razão"] || data[index]["Razao"] || data[index]["razao"];
          const fantasiaValue = data[index]["Fantasia"] || data[index]["fantasia"];
          if (razaoValue) {
            lead.name = String(razaoValue).trim();
          } else if (fantasiaValue) {
            lead.name = String(fantasiaValue).trim();
          }
        }
      }

      if (lead.name) {
        leads.push(lead as ValidatedLead);
      }
    });

    return leads;
  }
}
