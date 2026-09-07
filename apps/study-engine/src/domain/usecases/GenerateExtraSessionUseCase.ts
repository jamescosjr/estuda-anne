import { Flashcard } from '../entities/Flashcard.js';
import { Quiz } from '../entities/Quiz.js';
import {
  IMaterialRepository,
  IFlashcardRepository,
  IQuizRepository,
  ILanguageModelService,
} from '../ports/index.js';
import { IStudentAdaptiveProfileRepository } from './EvaluateQuizUseCase.js';
import { FlashcardSpecialistAgent } from '../services/pedagogical-agents/FlashcardSpecialistAgent.js';
import { QuizSpecialistAgent } from '../services/pedagogical-agents/QuizSpecialistAgent.js';

export interface GenerateExtraSessionInput {
  studentId: string;
  materialId?: string;
  targetType?: 'flashcards' | 'quiz' | 'both';
}

export interface GenerateExtraSessionOutput {
  studentId: string;
  generatedFlashcardsCount: number;
  generatedQuizId?: string;
  flashcards: Flashcard[];
  quiz?: Quiz | null;
  weakTopics: string[];
}

export class GenerateExtraSessionUseCase {
  private readonly flashcardAgent: FlashcardSpecialistAgent;
  private readonly quizAgent: QuizSpecialistAgent;

  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository,
    private readonly quizRepository: IQuizRepository,
    private readonly aiService: ILanguageModelService,
    private readonly profileRepository?: IStudentAdaptiveProfileRepository
  ) {
    this.flashcardAgent = new FlashcardSpecialistAgent(this.aiService, this.flashcardRepository);
    this.quizAgent = new QuizSpecialistAgent(this.aiService, this.quizRepository);
  }

  public async execute(input: GenerateExtraSessionInput): Promise<GenerateExtraSessionOutput> {
    const { studentId, materialId, targetType = 'both' } = input;

    // 1. Carrega materiais do estudante (ou material específico)
    let targetMaterials = [];
    if (materialId) {
      const mat = await this.materialRepository.findById(materialId);
      if (mat) targetMaterials.push(mat);
    } else {
      targetMaterials = (await this.materialRepository.findByStudentId(studentId)) || [];
    }

    if (targetMaterials.length === 0) {
      throw new Error('Nenhum material cadastrado encontrado para gerar a sessão extra de estudos.');
    }

    const primaryMaterial = targetMaterials[0];
    const combinedText = targetMaterials.map((m) => m.rawContent).join('\n\n') || primaryMaterial.title;
    const combinedKeyConcepts = Array.from(
      new Set(targetMaterials.flatMap((m) => m.keyConcepts || []))
    );

    // 2. Carrega perfil adaptativo e tópicos de fragilidade recente do aluno
    let focusTopics: Array<{ topic: string; priorityWeight: number }> = [];
    let weakTopics: string[] = [];

    if (this.profileRepository) {
      const profile = await this.profileRepository.findByStudentId(studentId);
      if (profile && profile.topicWeights) {
        focusTopics = Object.entries(profile.topicWeights).map(([topic, detail]) => ({
          topic,
          priorityWeight: detail.priorityWeight,
        }));
        weakTopics = focusTopics
          .filter((t) => t.priorityWeight > 1.5)
          .map((t) => t.topic);
      }
    }

    let generatedFlashcards: Flashcard[] = [];
    let generatedQuiz: Quiz | null = null;

    // 3. Geração Adaptativa de Flashcards de reforço (se solicitado)
    if (targetType === 'flashcards' || targetType === 'both') {
      generatedFlashcards = await this.flashcardAgent.generateFlashcards(
        primaryMaterial.id,
        studentId,
        combinedText,
        combinedKeyConcepts,
        focusTopics,
        true // Persiste no MongoDB agendado via SM-2
      );
    }

    // 4. Geração Adaptativa de Quiz de reforço (se solicitado)
    if (targetType === 'quiz' || targetType === 'both') {
      generatedQuiz = await this.quizAgent.generateQuiz(
        primaryMaterial.id,
        studentId,
        `Sessão Extra: ${primaryMaterial.title}`,
        combinedText,
        focusTopics,
        true // Persiste no MongoDB
      );
    }

    return {
      studentId,
      generatedFlashcardsCount: generatedFlashcards.length,
      generatedQuizId: generatedQuiz?.id,
      flashcards: generatedFlashcards,
      quiz: generatedQuiz,
      weakTopics,
    };
  }
}
