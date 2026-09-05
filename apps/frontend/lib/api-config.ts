/**
 * Obtém a URL base da API (BFF) configurada via variáveis de ambiente.
 * No ambiente do navegador (client-side), se estiver rodando localmente (localhost/127.0.0.1),
 * aponta diretamente para o BFF na porta 3001. Em produção via Nginx, utiliza a URL configurada
 * ou caminho relativo ("").
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const url = process.env.NEXT_PUBLIC_BFF_URL || process.env.NEXT_PUBLIC_API_URL
    if (url && url.trim().length > 0) {
      return url.replace(/\/+$/, '')
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3001`
    }
    // Em produção via Nginx, requisições relativas vão para o mesmo domínio (/api/...)
    return ''
  }

  const serverUrl = process.env.NEXT_PUBLIC_BFF_URL || process.env.NEXT_PUBLIC_API_URL || process.env.BFF_INTERNAL_URL
  if (serverUrl && serverUrl.trim().length > 0) {
    return serverUrl.replace(/\/+$/, '')
  }
  return 'http://localhost:3001'
}
