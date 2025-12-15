import Papa from "papaparse";
import { IFileParser, ParseResult, ParsedRow } from "./IFileParser";

export class CSVFileParser implements IFileParser {
  async parse(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
      const errors: string[] = [];

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          return header.trim().toLowerCase();
        },
        complete: (results) => {
          const data: ParsedRow[] = results.data.map((row) => {
            const parsedRow: ParsedRow = {};
            Object.keys(row).forEach((key) => {
              const value = row[key]?.trim();
              parsedRow[key] = value === "" ? null : value;
            });
            return parsedRow;
          });

          if (results.errors.length > 0) {
            results.errors.forEach((error) => {
              errors.push(`Linha ${error.row}: ${error.message}`);
            });
          }

          resolve({ data, errors });
        },
        error: (error) => {
          errors.push(`Erro ao processar CSV: ${error.message}`);
          resolve({ data: [], errors });
        },
      });
    });
  }
}






