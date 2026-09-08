import { Quiz, QuizQuestion } from '../entities/Quiz.js';
import { interleaveByKey } from './FlashcardStudySession.js';

export interface QuizBankItem extends QuizQuestion {
  quizId: string;
  materialId: string;
  subject: string;
}

export function flattenQuizzes(quizzes: Quiz[]): QuizBankItem[] {
  const items: QuizBankItem[] = [];
  const seenPrompts = new Set<string>();

  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const key = question.prompt.trim().toLowerCase();
      if (seenPrompts.has(key)) continue;
      seenPrompts.add(key);
      items.push({
        ...question,
        quizId: quiz.id,
        materialId: quiz.materialId,
        subject: quiz.title.replace(/^Quiz:\s*/i, '').replace(/^Sessão Extra:\s*/i, ''),
      });
    }
  }

  return items;
}

export function questionMatchesTopic(item: QuizBankItem, topic?: string): boolean {
  if (!topic || topic.trim() === '' || topic === 'all') return true;
  const needle = topic.trim().toLowerCase();
  const haystack = `${item.subject} ${item.prompt}`.toLowerCase();
  return haystack.includes(needle);
}

export function weaknessScore(prompt: string, weakTopics: readonly string[]): number {
  if (!weakTopics.length) return 0;
  const text = prompt.toLowerCase();
  let score = 0;
  for (const topic of weakTopics) {
    const needle = topic.trim().toLowerCase();
    if (needle.length > 2 && text.includes(needle)) {
      score += 2;
    }
  }
  return score;
}

export function rankBankByWeakness(items: QuizBankItem[], weakTopics: readonly string[]): QuizBankItem[] {
  return [...items].sort((a, b) => weaknessScore(b.prompt, weakTopics) - weaknessScore(a.prompt, weakTopics));
}

export interface ComposeQuizSessionInput {
  newQuestions: QuizBankItem[];
  bankQuestions: QuizBankItem[];
  count: number;
  excludeIds?: string[];
  weakTopics?: string[];
}

export interface ComposeQuizSessionResult {
  session: QuizBankItem[];
  newCount: number;
  bankCount: number;
}

export function composeQuizSession(input: ComposeQuizSessionInput): ComposeQuizSessionResult {
  const exclude = new Set(input.excludeIds ?? []);
  const weak = input.weakTopics ?? [];

  const uniqueNew = input.newQuestions.filter((item) => !exclude.has(item.id));
  const newIds = new Set(uniqueNew.map((item) => item.id));
  const bank = rankBankByWeakness(
    input.bankQuestions.filter((item) => !exclude.has(item.id) && !newIds.has(item.id)),
    weak
  );

  const target = Math.max(3, input.count);
  const interleavedNew = interleaveByKey(uniqueNew, (item) => item.subject || item.materialId);
  const interleavedBank = interleaveByKey(bank, (item) => item.subject || item.materialId);

  const newSlots = Math.min(
    interleavedNew.length,
    interleavedNew.length === 0 ? 0 : Math.max(Math.ceil(target * 0.55), 1)
  );
  const pickedNew = interleavedNew.slice(0, Math.min(newSlots, target));
  const pickedBank = interleavedBank.slice(0, Math.max(0, target - pickedNew.length));
  const session = interleaveByKey([...pickedNew, ...pickedBank], (item) => item.subject || item.materialId).slice(
    0,
    target
  );

  return {
    session,
    newCount: pickedNew.length,
    bankCount: pickedBank.length,
  };
}
