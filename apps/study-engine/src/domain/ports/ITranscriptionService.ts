export interface TranscriptionResult {
  text: string;
  language?: string;
  durationSeconds?: number;
}

export interface ITranscriptionService {
  transcribe(fileUrlOrBuffer: string | Buffer, mimeType: string): Promise<TranscriptionResult>;
}
