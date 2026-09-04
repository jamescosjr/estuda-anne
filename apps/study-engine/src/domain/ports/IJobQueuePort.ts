export interface ProcessMaterialJobPayload {
  materialId: string;
}

export interface IJobQueuePort {
  publishMaterialProcessingJob(payload: ProcessMaterialJobPayload): Promise<void>;
}
