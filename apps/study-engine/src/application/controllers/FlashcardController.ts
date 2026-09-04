import { FastifyReply, FastifyRequest } from 'fastify';
import {
  ReviewFlashcardBodySchema,
  ReviewFlashcardParamsSchema,
  GetDueFlashcardsQuerySchema,
} from '../dto/flashcard.dto.js';
import { ReviewFlashcardUseCase } from '../../domain/usecases/ReviewFlashcardUseCase.js';
import { GetDueFlashcardsUseCase } from '../../domain/usecases/GetDueFlashcardsUseCase.js';

export class FlashcardController {
  constructor(
    private readonly reviewUseCase: ReviewFlashcardUseCase,
    private readonly getDueCardsUseCase: GetDueFlashcardsUseCase
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
}
