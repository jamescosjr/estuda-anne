import { FastifyReply, FastifyRequest } from 'fastify';
import {
  ReviewFlashcardBodySchema,
  ReviewFlashcardParamsSchema,
  GetDueFlashcardsQuerySchema,
  ExtraSessionBodySchema,
} from '../dto/flashcard.dto.js';
import { ReviewFlashcardUseCase } from '../../domain/usecases/ReviewFlashcardUseCase.js';
import { GetDueFlashcardsUseCase } from '../../domain/usecases/GetDueFlashcardsUseCase.js';
import { GenerateExtraSessionUseCase } from '../../domain/usecases/GenerateExtraSessionUseCase.js';
import { isSubjectAllowed } from '../../domain/services/FlashcardStudySession.js';

export class FlashcardController {
  constructor(
    private readonly reviewUseCase: ReviewFlashcardUseCase,
    private readonly getDueCardsUseCase: GetDueFlashcardsUseCase,
    private readonly extraSessionUseCase?: GenerateExtraSessionUseCase
  ) {}

  public async getDue(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = GetDueFlashcardsQuerySchema.parse(request.query);
    const { cards, subjectByMaterialId } = await this.getDueCardsUseCase.execute({
      studentId: query.studentId,
      limit: query.limit,
      topic: query.topic,
      allowedSubjects: query.allowedSubjects,
    });

    const allowed = query.allowedSubjects;
    reply.status(200).send(cards.map((card) => {
      const rawSubject = subjectByMaterialId[card.materialId] || card.tags[0] || 'Conceito';
      const cleanSubject = allowed && allowed.length > 0
        ? (allowed.find((s) => isSubjectAllowed(rawSubject, [s])) || allowed[0])
        : rawSubject;
      return {
        ...card.toJSON(),
        subject: cleanSubject,
      };
    }));
  }

  public async review(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ReviewFlashcardParamsSchema.parse(request.params);
    const body = ReviewFlashcardBodySchema.parse(request.body);

    const result = await this.reviewUseCase.execute({
      flashcardId: id,
      grade: body.grade,
    });

    reply.status(200).send(result);
  }

  public async generateExtraSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.extraSessionUseCase) {
      reply.status(501).send({ message: 'GenerateExtraSessionUseCase indisponível' });
      return;
    }

    const body = ExtraSessionBodySchema.parse(request.body);
    const result = await this.extraSessionUseCase.execute({
      studentId: body.studentId,
      materialId: body.materialId,
      topic: body.topic || body.subjectId,
      allowedSubjects: body.allowedSubjects,
      count: body.count,
      excludeIds: body.excludeIds,
      targetType: 'flashcards',
    });

    const allowed = body.allowedSubjects;
    reply.status(201).send({
      message: 'Sessão extra de flashcards gerada e persistida com sucesso!',
      generatedCount: result.generatedFlashcardsCount,
      mixedDueCount: result.mixedDueCount,
      weakTopics: result.weakTopics,
      adaptiveHint: result.adaptiveHint,
      newCardIds: result.newCardIds,
      flashcards: result.flashcards.map((f) => {
        const rawSubject = f.tags[0] || 'Conceito';
        const cleanSubject = allowed && allowed.length > 0
          ? (allowed.find((s) => isSubjectAllowed(rawSubject, [s])) || allowed[0])
          : rawSubject;
        return {
          ...f.toJSON(),
          subject: cleanSubject,
        };
      }),
    });
  }
}
