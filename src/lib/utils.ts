import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Remove todos os caracteres não numéricos de um telefone
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Formata número de telefone para exibição (apenas visual, não salva assim)
export function formatPhoneDisplay(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  // Formato: +55 (11) 99999-9999
  if (cleaned.length === 13 && cleaned.startsWith("55")) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  
  // Formato: (11) 99999-9999
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 7);
    const part2 = cleaned.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // Formato: (11) 9999-9999
  if (cleaned.length === 10) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 6);
    const part2 = cleaned.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // Retorna como está se não corresponder aos formatos
  return phone;
}

// Formata número para WhatsApp (com código do país)
export function formatWhatsAppNumber(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  // Se já começa com 55, retorna como está
  if (cleaned.startsWith("55")) {
    return cleaned;
  }
  
  // Se tem 11 ou 10 dígitos, adiciona 55
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  // Se já tem código de país (mais de 11 dígitos), retorna como está
  if (cleaned.length > 11) {
    return cleaned;
  }
  
  // Caso padrão: adiciona 55
  return `55${cleaned}`;
}

// Gera o remote_jid no formato do WhatsApp
export function generateRemoteJid(phone: string): string {
  if (!phone) return "";
  const whatsappNumber = formatWhatsAppNumber(phone);
  return `${whatsappNumber}@s.whatsapp.net`;
}
