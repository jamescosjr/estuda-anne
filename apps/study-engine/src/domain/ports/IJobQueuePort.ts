export interface ProcessMaterialJobPayload {
  materialId: string;
  textContent?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  correlationId?: string;
}

export interface IJobQueuePort {
  publishMaterialProcessingJob(payload: ProcessMaterialJobPayload): Promise<void>;
}
