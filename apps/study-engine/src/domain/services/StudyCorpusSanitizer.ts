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
  'segundo o pdf',
  'segundo o documento',
  'segundo o texto',
  'de acordo com o pdf',
  'de acordo com o documento',
  'de acordo com o texto',
  'conforme o texto',
  'conforme o documento',
  'conforme o pdf',
  'no pdf',
  'no documento',
  'no arquivo',
  'na página',
  'na pagina',
  'no item',
  'no trecho',
  'no anexo',
  'texto enviado',
  'material enviado',
];

const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'como', 'qual', 'quais', 'que', 'se', 'porq', 'porque', 'sobre', 'entre',
  'ate', 'ateh', 'ate3', 'está', 'esta', 'são', 'sao', 'ser', 'ter', 'onde', 'quando',
  'quem', 'qual', 'o que', 'qual e', 'qual e o', 'qual e a',
]);

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

export function isDocumentMetaReferencing(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  
  if (OFF_TOPIC_HINTS.some((hint) => t.includes(hint))) return true;
  
  // Detecta referências a objetos internos de PDF (ex: "objeto 14", "objeto 3", "stream do objeto 12")
  if (/\b(objeto|obj)\s+\d+\b/i.test(t)) return true;
  if (/\b(fluxo de dados|stream)\b.*\b(objeto|pdf|imagem|documento)\b/i.test(t)) return true;

  // Detecta padrões como "no item 3", "na página 12", "no capítulo 2 do pdf", "conforme a figura 4 do documento"
  const docRefRegex = /\b(no|na|do|da|segundo|conforme|de acordo com|conforme o|citado no|mencionado no|conforme a|conforme os)\s+(?:item|página|pagina|pdf|documento|arquivo|anexo|trecho|seção|secao|capítulo|capitulo|objeto|obj)\b/i;
  if (docRefRegex.test(t)) return true;

  // Detecta explicitamente "pdf", "documento", "arquivo" quando usados no contexto de estrutura técnica do arquivo
  const explicitFormatRegex = /\b(pdf|metadado|metadados|creationdate|moddate)\b/i;
  if (explicitFormatRegex.test(t)) return true;

  return false;
}

export function isPedagogicallyOffTopic(prompt: string): boolean {
  if (!prompt) return false;
  const t = prompt.toLowerCase();
  if (isDocumentMetaReferencing(prompt)) return true;
  if (ISO_DATE.test(prompt) || PDF_DATE.test(prompt) || NODE_DATE_STR.test(prompt)) return true;
  if (/\banne\b/i.test(t)) return true;
  if (/\bautor\b/.test(t) && /(pdf|documento|arquivo|metadad)/.test(t)) return true;
  if (isGenericPlaceholderPrompt(prompt)) return true;
  return false;
}

export function isGenericPlaceholderPrompt(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  if (/\[card de revisão/.test(t)) return true;
  if (/aplicações práticas essenciais/.test(t) && /aprendizado universitário/.test(t)) return true;
  if (/\[questão de avaliação/.test(t) && /pilares fundamentais/.test(t)) return true;
  return false;
}

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para comparação uniforme
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of set1) {
    if (set2.has(word)) intersectionCount++;
  }

  const unionSize = set1.size + set2.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

export function isDuplicateOrHighlySimilar(newText: string, existingTexts: readonly string[], threshold = 0.50): boolean {
  if (!newText || existingTexts.length === 0) return false;
  const normNew = newText.trim().toLowerCase();

  for (const existing of existingTexts) {
    const normExist = existing.trim().toLowerCase();
    if (normNew === normExist) return true;
    if (calculateJaccardSimilarity(newText, existing) >= threshold) {
      return true;
    }
  }

  return false;
}

export function isUnusableStudyCorpus(text: string): boolean {
  if (!text || text.trim().length < 20) return true;
  if (text.startsWith('PK') && text.includes('[Content_Types].xml')) return true;
  if (text.includes('PK\u0003\u0004')) return true;
  const sample = text.slice(0, 400);
  const printable = sample.replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]/g, '');
  if (printable.length / Math.max(sample.length, 1) < 0.55) return true;
  if (/dados binários brutos|arquivo compactado \(estrutura interna/i.test(text)) return true;
  return false;
}

export function materialHasStudyCorpus(rawContent?: string, summary?: string): boolean {
  if (rawContent && !isUnusableStudyCorpus(rawContent)) return true;
  if (summary && summary.trim().length >= 40 && !isUnusableStudyCorpus(summary)) return true;
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
