import { FastifyReply, FastifyRequest } from 'fastify';
import {
  AnalyzeScheduleFileBodySchema,
  CompleteScheduleItemBodySchema,
  CompleteScheduleItemParamsSchema,
  GenerateScheduleBodySchema,
  GetScheduleQuerySchema,
} from '../dto/schedule.dto.js';
import { GenerateStudyScheduleUseCase } from '../../domain/usecases/GenerateStudyScheduleUseCase.js';
import { CompleteScheduleItemUseCase } from '../../domain/usecases/CompleteScheduleItemUseCase.js';
import { AnalyzeScheduleFileUseCase } from '../../domain/usecases/AnalyzeScheduleFileUseCase.js';
import { IStudyScheduleRepository } from '../../domain/ports/IStudyScheduleRepository.js';

export class ScheduleController {
  constructor(
    private readonly generateUseCase: GenerateStudyScheduleUseCase,
    private readonly completeItemUseCase: CompleteScheduleItemUseCase,
    private readonly scheduleRepository: IStudyScheduleRepository,
    private readonly analyzeFileUseCase?: AnalyzeScheduleFileUseCase
  ) {}

  public async generate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = GenerateScheduleBodySchema.parse(request.body);
    const schedule = await this.generateUseCase.execute({
      studentId: body.studentId,
      title: body.title,
      subjects: body.subjects,
      targetExamDate: body.targetExamDate,
      dailyStudyMinutesTarget: body.dailyStudyMinutesTarget,
      periodStartDate: body.periodStartDate,
      examDates: body.examDates,
    });
    reply.status(200).send(schedule.toJSON());
  }

  public async getByStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = GetScheduleQuerySchema.parse(request.query);
    const schedule = await this.scheduleRepository.findByStudentId(query.studentId);
    if (!schedule) {
      reply.status(404).send({ message: 'Study schedule not found' });
      return;
    }
    reply.status(200).send(schedule.toJSON());
  }

  public async completeItem(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = CompleteScheduleItemParamsSchema.parse(request.params);
    const body = CompleteScheduleItemBodySchema.parse(request.body);
    const schedule = await this.completeItemUseCase.execute({
      studentId: body.studentId,
      itemId: params.itemId,
    });
    reply.status(200).send(schedule.toJSON());
  }

  public async analyzeFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.analyzeFileUseCase) {
      reply.status(501).send({ message: 'Schedule file analysis is not available' });
      return;
    }
    const body = AnalyzeScheduleFileBodySchema.parse(request.body);
    const result = await this.analyzeFileUseCase.execute({
      studentId: body.studentId,
      fileBase64: body.fileBase64,
      mimeType: body.mimeType,
      textContent: body.textContent,
    });
    reply.status(200).send(result);
  }
}
