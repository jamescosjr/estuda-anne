import { ITranscriptionService, TranscriptionResult } from '../../domain/ports/ITranscriptionService.js';
import { env } from '../config/env.js';

export class WhisperAdapter implements ITranscriptionService {
  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = env.OPENAI_API_KEY) {
    this.apiKey = apiKey;
  }

  public async transcribe(fileUrlOrBuffer: string | Buffer, _mimeType: string): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      // Fallback para desenvolvimento e testes
      return {
        text: `Transcrição sintetizada para ${typeof fileUrlOrBuffer === 'string' ? fileUrlOrBuffer : 'áudio em buffer'}. Conteúdo aborda conceitos-chave para estudo universitário da Anne.`,
        durationSeconds: 120,
        language: 'pt',
      };
    }

    // Integração com a API de Transcrição Whisper (OpenAI audio transcriptions)
    // Usando FormData padrão do Node.js 18+
    const formData = new FormData();
    formData.append('model', 'whisper-1');

    if (typeof fileUrlOrBuffer === 'string') {
      // Faz download do stream de áudio remoto e anexa
      const fileRes = await fetch(fileUrlOrBuffer);
      const blob = await fileRes.blob();
      formData.append('file', blob, 'audio.mp3');
    } else {
      const blob = new Blob([new Uint8Array(fileUrlOrBuffer)]);
      formData.append('file', blob, 'audio.mp3');
    }

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Whisper transcription error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as any;
    return {
      text: data.text,
      language: data.language,
      durationSeconds: data.duration,
    };
  }
}
