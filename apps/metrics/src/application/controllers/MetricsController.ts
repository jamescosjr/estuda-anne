import { FastifyReply, FastifyRequest } from 'fastify';
import { GetStudentMetricsUseCase } from '../../domain/usecases/GetStudentMetricsUseCase.js';

export class MetricsController {
  constructor(private readonly getStudentMetricsUseCase: GetStudentMetricsUseCase) {}

  public getOverview = async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId, date, subjects } = (request.query as any) || {};

    if (!studentId) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'studentId é um parâmetro obrigatório em query parameters.',
      });
    }

    const asOfDate = date ? new Date(date) : undefined;
    const allowedSubjects = typeof subjects === 'string' ? subjects.split(',') : undefined;

    try {
      const overview = await this.getStudentMetricsUseCase.execute({
        studentId,
        asOfDate,
        subjects: allowedSubjects,
      });

      return reply.status(200).send(overview);
    } catch (err: any) {
      return reply.status(500).send({
        error: 'MetricsCalculationFailed',
        message: err.message || 'Falha ao calcular métricas do estudante',
      });
    }
  };

  public getScheduleAdherence = async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId, date } = (request.query as any) || {};

    if (!studentId) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'studentId é um parâmetro obrigatório.',
      });
    }

    try {
      const overview = await this.getStudentMetricsUseCase.execute({
        studentId,
        asOfDate: date ? new Date(date) : undefined,
      });

      return reply.status(200).send(overview.scheduleAdherence);
    } catch (err: any) {
      return reply.status(500).send({
        error: 'MetricsCalculationFailed',
        message: err.message || 'Falha ao calcular aderência ao cronograma',
      });
    }
  };

  public getEvolution = async (request: FastifyRequest, reply: FastifyReply) => {
    const { studentId, date } = (request.query as any) || {};

    if (!studentId) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'studentId é um parâmetro obrigatório.',
      });
    }

    try {
      const overview = await this.getStudentMetricsUseCase.execute({
        studentId,
        asOfDate: date ? new Date(date) : undefined,
      });

      return reply.status(200).send(overview.evolutionary);
    } catch (err: any) {
      return reply.status(500).send({
        error: 'MetricsCalculationFailed',
        message: err.message || 'Falha ao calcular histórico evolutivo de estudos',
      });
    }
  };
}
