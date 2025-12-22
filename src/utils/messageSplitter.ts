export function splitResponse(text: string, maxLength = 300): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = text
    .split(/(?<=\.\s)|(?<=!\s)|(?<=\?\s)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const messages: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxLength) {
      if (current) {
        messages.push(current.trim());
      }
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (current) {
    messages.push(current.trim());
  }

  return messages.length > 0 ? messages : [text];
}

