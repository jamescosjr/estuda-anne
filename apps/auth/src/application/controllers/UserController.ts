import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CreateStudentUserUseCase } from '../../domain/usecases/CreateStudentUserUseCase.js';
import { UpdateStudentUserUseCase } from '../../domain/usecases/UpdateStudentUserUseCase.js';
import { DeleteStudentUserUseCase } from '../../domain/usecases/DeleteStudentUserUseCase.js';
import { IUserRepository } from '../../domain/ports/IUserRepository.js';

const CreateStudentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const UpdateStudentSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
    .refine((val) => val === undefined || val.length >= 6, {
      message: 'A nova senha deve possuir no mínimo 6 caracteres',
    }),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  course: z.string().optional(),
  period: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  studyGoalMinutes: z.number().positive().optional(),
});

export class UserController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly createStudentUserUseCase: CreateStudentUserUseCase,
    private readonly updateStudentUserUseCase: UpdateStudentUserUseCase,
    private readonly deleteStudentUserUseCase: DeleteStudentUserUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase
  ) {}

  public async createStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = CreateStudentSchema.parse(request.body);
    const executor = request.userPayload!;

    const student = await this.createStudentUserUseCase.execute({
      executor,
      name: body.name,
      email: body.email,
      passwordText: body.password,
    });

    reply.status(201).send(student.toJSON());
  }

  public async updateStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const body = UpdateStudentSchema.parse(request.body);
    const executor = request.userPayload!;

    const updatedStudent = await this.updateStudentUserUseCase.execute({
      executor,
      studentId: id,
      name: body.name,
      email: body.email,
      passwordText: body.password,
    });

    reply.status(200).send(updatedStudent.toJSON());
  }

  public async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = UpdateProfileSchema.parse(request.body);
    const executor = request.userPayload!;

    const updatedUser = await this.updateProfileUseCase.execute({
      executor,
      name: body.name,
      course: body.course,
      period: body.period,
      subjects: body.subjects,
      studyGoalMinutes: body.studyGoalMinutes,
    });

    reply.status(200).send(updatedUser.toJSON());
  }

  public async deleteStudent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const executor = request.userPayload!;

    await this.deleteStudentUserUseCase.execute({
      executor,
      studentId: id,
    });

    reply.status(200).send({ message: 'Estudante removido com sucesso', id });
  }

  public async listStudents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { search, page, limit } = (request.query as { search?: string; page?: string; limit?: string }) || {};
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.userRepository.findStudentsPaginated({
      search: search || '',
      page: isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
      limit: isNaN(limitNum) || limitNum < 1 ? 10 : limitNum,
    });

    reply.status(200).send({
      students: result.students.map((s) => s.toJSON()),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }
}
