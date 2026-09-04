/**
 * Obtém a URL base da API (BFF) configurada via variáveis de ambiente.
 * Suporta NEXT_PUBLIC_BFF_URL e NEXT_PUBLIC_API_URL com fallback para http://localhost:3001.
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // No browser
    return (
      process.env.NEXT_PUBLIC_BFF_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001'
    )
  }
  return (
    process.env.NEXT_PUBLIC_BFF_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'
  )
}
