import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ReviewFlashcardBodySchema,
  ReviewFlashcardParamsSchema,
  GetDueFlashcardsQuerySchema,
} from '../dto/flashcard.dto.js';
import { ReviewFlashcardUseCase } from '../../domain/usecases/ReviewFlashcardUseCase.js';
import { GetDueFlashcardsUseCase } from '../../domain/usecases/GetDueFlashcardsUseCase.js';
import { GenerateExtraSessionUseCase } from '../../domain/usecases/GenerateExtraSessionUseCase.js';

const ExtraSessionBodySchema = z.object({
  studentId: z.string().min(1),
  materialId: z.string().optional(),
});

export class FlashcardController {
  constructor(
    private readonly reviewUseCase: ReviewFlashcardUseCase,
    private readonly getDueCardsUseCase: GetDueFlashcardsUseCase,
    private readonly extraSessionUseCase?: GenerateExtraSessionUseCase
  ) {}

  public async getDue(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = GetDueFlashcardsQuerySchema.parse(request.query);
    const cards = await this.getDueCardsUseCase.execute({
      studentId: query.studentId,
      limit: query.limit,
    });

    reply.status(200).send(cards.map(card => card.toJSON()));
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
      targetType: 'flashcards',
    });

    reply.status(201).send({
      message: 'Sessão extra de flashcards gerada e persistida com sucesso!',
      generatedCount: result.generatedFlashcardsCount,
      weakTopics: result.weakTopics,
      flashcards: result.flashcards.map((f) => f.toJSON()),
    });
  }
}
