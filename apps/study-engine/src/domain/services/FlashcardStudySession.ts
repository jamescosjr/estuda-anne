import { Flashcard } from '../entities/Flashcard.js';

/** Similaridade alta o bastante para ser o mesmo enunciado, não o mesmo assunto. */
export const GENERATION_SIMILARITY_THRESHOLD = 0.78;

export function exactFrontKey(front: string): string {
  return front.trim().toLowerCase();
}

export function uniqueByExactFront<T extends { id: string; front: string }>(cards: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const card of cards) {
    const key = exactFrontKey(card.front);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
  }
  return unique;
}

export function interleaveByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item) || 'geral';
    const list = buckets.get(key);
    if (list) {
      list.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const queues = [...buckets.values()];
  const result: T[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        progressed = true;
      }
    }
  }
  return result;
}

export function subjectBucket(card: Flashcard): string {
  return card.tags[0] || card.materialId || 'geral';
}

export interface ComposeAdaptiveSessionInput {
  newCards: Flashcard[];
  dueCards: Flashcard[];
  count: number;
  excludeIds?: string[];
}

export interface ComposeAdaptiveSessionResult {
  session: Flashcard[];
  newCount: number;
  dueCount: number;
}

export function composeAdaptiveSession(input: ComposeAdaptiveSessionInput): ComposeAdaptiveSessionResult {
  const exclude = new Set(input.excludeIds ?? []);
  const newOnes = uniqueByExactFront(input.newCards.filter((card) => !exclude.has(card.id)));
  const newIds = new Set(newOnes.map((card) => card.id));
  const due = uniqueByExactFront(
    input.dueCards.filter((card) => !exclude.has(card.id) && !newIds.has(card.id))
  );

  const target = Math.max(3, input.count);
  const interleavedNew = interleaveByKey(newOnes, subjectBucket);
  const interleavedDue = interleaveByKey(due, subjectBucket);

  const newSlots = Math.min(
    interleavedNew.length,
    interleavedNew.length === 0 ? 0 : Math.max(Math.ceil(target * 0.55), 1)
  );
  const pickedNew = interleavedNew.slice(0, Math.min(newSlots, target));
  const pickedDue = interleavedDue.slice(0, Math.max(0, target - pickedNew.length));
  const session = interleaveByKey([...pickedNew, ...pickedDue], subjectBucket).slice(0, target);

  return {
    session,
    newCount: pickedNew.length,
    dueCount: pickedDue.length,
  };
}

export function materialMatchesTopic(
  material: { title: string; subject?: string; keyConcepts: readonly string[] },
  topic?: string
): boolean {
  if (!topic || topic.trim() === '' || topic === 'all') return true;
  const needle = topic.trim().toLowerCase();
  const haystack = [material.title, material.subject, ...material.keyConcepts]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle) || needle.includes(material.title.toLowerCase());
}
