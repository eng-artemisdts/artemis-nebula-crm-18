export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  data: ParsedRow[];
  errors: string[];
}

export interface IFileParser {
  parse(file: File): Promise<ParseResult>;
}

