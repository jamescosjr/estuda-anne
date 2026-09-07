import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateMaterialSchema, ProcessMaterialParamsSchema, ProcessMaterialBodySchema } from '../dto/material.dto.js';
import { Material } from '../../domain/entities/Material.js';
import { IMaterialRepository } from '../../domain/ports/IMaterialRepository.js';
import { IJobQueuePort } from '../../domain/ports/IJobQueuePort.js';
import { ProcessMaterialUseCase } from '../../domain/usecases/ProcessMaterialUseCase.js';
import { DeleteMaterialUseCase } from '../../domain/usecases/DeleteMaterialUseCase.js';

export class MaterialController {
  constructor(
    private readonly materialRepository: IMaterialRepository,
    private readonly processMaterialUseCase: ProcessMaterialUseCase,
    private readonly deleteMaterialUseCase?: DeleteMaterialUseCase,
    private readonly jobQueue?: IJobQueuePort
  ) {}

  public async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validatedBody = CreateMaterialSchema.parse(request.body);

    const material = Material.create({
      studentId: validatedBody.studentId,
      title: validatedBody.title,
      subject: validatedBody.subject,
      format: validatedBody.format,
      fileUrl: validatedBody.fileUrl,
      fileSizeBytes: validatedBody.fileSizeBytes,
      mimeType: validatedBody.mimeType,
      rawContent: validatedBody.rawContent,
    });

    await this.materialRepository.save(material);
    reply.status(201).send(material.toListJSON());
  }

  public async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ProcessMaterialParamsSchema.parse(request.params);
    const material = await this.materialRepository.findById(id);

    if (!material) {
      reply.status(404).send({ message: 'Material not found' });
      return;
    }

    reply.status(200).send(material.toListJSON());
  }

  public async process(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ProcessMaterialParamsSchema.parse(request.params);
    const body = ProcessMaterialBodySchema.parse(request.body ?? {});
    const correlationId = String(request.headers['x-correlation-id'] || crypto.randomUUID());

    if (this.jobQueue && body.async !== false) {
      await this.jobQueue.publishMaterialProcessingJob({
        materialId: id,
        textContent: body.textContent,
        fileBase64: body.fileBase64,
        mimeType: body.mimeType,
        fileName: body.fileName,
        correlationId,
      });
      reply.status(202).send({
        materialId: id,
        status: 'PENDING',
        message: 'Processamento enfileirado',
      });
      return;
    }

    const result = await this.processMaterialUseCase.execute({
      materialId: id,
      textContent: body.textContent,
      force: body.force,
      fileBase64: body.fileBase64,
      mimeType: body.mimeType,
      fileName: body.fileName,
    });
    reply.status(200).send(result);
  }

  public async getByStudentId(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { studentId = 'anne-student-1' } = (request.query as { studentId?: string }) || {};
    const materials = await this.materialRepository.findByStudentId(studentId);
    reply.status(200).send(materials.map((m) => m.toListJSON()));
  }

  public async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = ProcessMaterialParamsSchema.parse(request.params);
    if (this.deleteMaterialUseCase) {
      const result = await this.deleteMaterialUseCase.execute({ materialId: id });
      reply.status(200).send(result);
    } else {
      await this.materialRepository.delete(id);
      reply.status(200).send({ success: true, id });
    }
  }
}
