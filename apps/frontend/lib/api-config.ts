/**
 * Obtém a URL base da API (BFF) configurada via variáveis de ambiente.
 * No ambiente do navegador (client-side), se não houver uma URL absoluta configurada,
 * retorna string vazia "" para utilizar requisições relativas no mesmo domínio (ex: /api/auth/login via Nginx).
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const url = process.env.NEXT_PUBLIC_BFF_URL || process.env.NEXT_PUBLIC_API_URL
    if (url && !url.includes('localhost')) {
      return url.replace(/\/+$/, '')
    }
    // No navegador em produção/proxy, requisição relativa garante envio ao mesmo domínio (ex: /api/...)
    return ''
  }

  const serverUrl = process.env.NEXT_PUBLIC_BFF_URL || process.env.NEXT_PUBLIC_API_URL
  if (serverUrl) {
    return serverUrl.replace(/\/+$/, '')
  }
  return 'http://localhost:3001'
}
