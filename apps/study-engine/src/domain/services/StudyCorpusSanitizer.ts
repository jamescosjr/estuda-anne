const METADATA_LINE =
  /^(author|autor|creator|producer|creationdate|moddate|title|subject|keywords)\s*[:/=]/i;
const PDF_DATE = /\bD:\d{8,14}/;
const ISO_DATE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/;
const NODE_DATE_STR =
  /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}/;

const OFF_TOPIC_HINTS = [
  'autor do documento',
  'autor do pdf',
  'metadados',
  'metadata',
  'creationdate',
  'moddate',
  'data no formato',
  'formato node',
  'toisostring',
  'nome do arquivo',
  'segundo os metadados',
];

export function looksLikeDocumentMetadata(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (METADATA_LINE.test(trimmed)) return true;
  if (PDF_DATE.test(trimmed) && trimmed.length < 80) return true;
  if (ISO_DATE.test(trimmed) && trimmed.replace(ISO_DATE, '').trim().length < 8) return true;
  if (NODE_DATE_STR.test(trimmed)) return true;
  if (/brasilia standard time|gmt[+-]\d{4}/i.test(trimmed)) return true;
  return false;
}

export function sanitizeStudyCorpus(raw: string): string {
  if (!raw) return '';

  const parts = raw
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !looksLikeDocumentMetadata(part));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function isPedagogicallyOffTopic(prompt: string): boolean {
  const t = prompt.toLowerCase();
  if (OFF_TOPIC_HINTS.some((hint) => t.includes(hint))) return true;
  if (ISO_DATE.test(prompt) || PDF_DATE.test(prompt) || NODE_DATE_STR.test(prompt)) return true;
  if (/\banne\b/.test(t) && /(precisa|deve|estudante|analisar o)/.test(t)) return true;
  if (/\bautor\b/.test(t) && /(pdf|documento|arquivo|metadad)/.test(t)) return true;
  return false;
}

export function toFocusTopics(
  keyConcepts: readonly string[]
): Array<{ topic: string; priorityWeight: number }> {
  const unique = Array.from(new Set(keyConcepts.map((c) => c.trim()).filter(Boolean)));
  const total = unique.length;
  return unique.map((topic, index) => ({
    topic,
    priorityWeight: Number((1 + ((total - index) / Math.max(total, 1)) * 2).toFixed(2)),
  }));
}
