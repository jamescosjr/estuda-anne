export const CORRELATION_HEADER = 'x-correlation-id';

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function logStructured(payload: Record<string, unknown>): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload,
  }));
}
