import { Flashcard } from '../entities/Flashcard.js';

export interface IFlashcardRepository {
  save(flashcard: Flashcard): Promise<void>;
  saveMany(flashcards: Flashcard[]): Promise<void>;
  findById(id: string): Promise<Flashcard | null>;
  findByStudentId(studentId: string): Promise<Flashcard[]>;
  findDueCards(studentId: string, asOfDate: Date, limit?: number): Promise<Flashcard[]>;
  findByMaterialId(materialId: string): Promise<Flashcard[]>;
  update(flashcard: Flashcard): Promise<void>;
  delete(id: string): Promise<void>;
}
