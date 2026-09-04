import { IJobQueuePort, ProcessMaterialJobPayload } from '../../domain/ports/IJobQueuePort.js';

export type JobHandler = (payload: ProcessMaterialJobPayload) => Promise<void>;

export class InMemoryJobQueueAdapter implements IJobQueuePort {
  private handlers: JobHandler[] = [];

  public registerHandler(handler: JobHandler): void {
    this.handlers.push(handler);
  }

  public async publishMaterialProcessingJob(payload: ProcessMaterialJobPayload): Promise<void> {
    // Desacopla a execução assíncrona do ciclo HTTP usando setImmediate
    setImmediate(async () => {
      for (const handler of this.handlers) {
        try {
          await handler(payload);
        } catch (err) {
          console.error(`Error processing job for material ${payload.materialId}:`, err);
        }
      }
    });
  }
}
