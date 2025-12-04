import * as XLSX from "xlsx";
import { IFileParser, ParseResult, ParsedRow } from "./IFileParser";

export class XLSXFileParser implements IFileParser {
  async parse(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
      const errors: string[] = [];

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            resolve({ data: [], errors: ["Erro ao ler arquivo"] });
            return;
          }

          let workbook: XLSX.WorkBook;

          if (data instanceof ArrayBuffer) {
            workbook = XLSX.read(data, { type: "array" });
          } else {
            workbook = XLSX.read(data, { type: "binary" });
          }

          const firstSheetName = workbook.SheetNames[0];

          if (!firstSheetName) {
            resolve({ data: [], errors: ["Arquivo não contém planilhas"] });
            return;
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            raw: false,
            defval: null,
          });

          const parsedData: ParsedRow[] = jsonData.map((row) => {
            const parsedRow: ParsedRow = {};
            Object.keys(row).forEach((key) => {
              const normalizedKey = key.trim().toLowerCase();
              const value = row[key];
              parsedRow[normalizedKey] = value === "" || value === null || value === undefined ? null : String(value).trim();
            });
            return parsedRow;
          });

          resolve({ data: parsedData, errors });
        } catch (error: any) {
          errors.push(`Erro ao processar XLSX: ${error.message}`);
          resolve({ data: [], errors });
        }
      };

      reader.onerror = () => {
        resolve({ data: [], errors: ["Erro ao ler arquivo"] });
      };

      reader.readAsArrayBuffer(file);
    });
  }
}

