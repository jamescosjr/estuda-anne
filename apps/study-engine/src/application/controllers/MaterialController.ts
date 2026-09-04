import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateMaterialSchema, ProcessMaterialParamsSchema } from '../dto/material.dto.js';
import { Material } from '../../domain/entities/Material.js';
import { IMaterialRepository } from '../../domain/ports/IMaterialRepository.js';
import { ProcessMaterialUseCase } from '../../domain/usecases/ProcessMaterialUseCase.js';

export class MaterialController {
  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly processMaterialUseCase: ProcessMaterialUseCase
  ) {}

  public async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validatedBody = CreateMaterialSchema.parse(request.body);

    const material = Material.create({
      studentId: validatedBody.studentId,
      title: validatedBody.title,
      format: validatedBody.format,
      fileUrl: validatedBody.fileUrl,
      fileSizeBytes: validatedBody.fileSizeBytes,
      mimeType: validatedBody.mimeType,
    });

    await this.materialRepository.save(material);
    reply.status(201).send(material.toJSON());
  }

  public async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ProcessMaterialParamsSchema.parse(request.params);
    const material = await this.materialRepository.findById(id);

    if (!material) {
      reply.status(404).send({ message: 'Material not found' });
      return;
    }

    reply.status(200).send(material.toJSON());
  }

  public async process(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ProcessMaterialParamsSchema.parse(request.params);
    const result = await this.processMaterialUseCase.execute({ materialId: id });
    reply.status(200).send(result);
  }

  public async getByStudentId(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { studentId = 'anne-student-1' } = (request.query as { studentId?: string }) || {};
    const materials = await this.materialRepository.findByStudentId(studentId);
    reply.status(200).send(materials.map((m) => m.toJSON()));
  }
}
