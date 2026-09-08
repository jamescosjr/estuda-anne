import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

const PROXY_TIMEOUT_MS = 180_000

function bffTarget(path: string[], search: string): string {
  const base = (process.env.BFF_INTERNAL_URL || 'http://bff:3001').replace(/\/+$/, '')
  return `${base}/api/${path.map(encodeURIComponent).join('/')}${search}`
}

function filterHeaders(source: Headers): Headers {
  const headers = new Headers()
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}

async function proxyToBff(request: NextRequest, path: string[]): Promise<Response> {
  const target = bffTarget(path, new URL(request.url).search)
  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await request.arrayBuffer() : undefined

  try {
    const upstream = await fetch(target, {
      method,
      headers: filterHeaders(request.headers),
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      cache: 'no-store',
    })

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: filterHeaders(upstream.headers),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao contatar o BFF'
    return Response.json(
      { error: 'BffProxyError', message },
      { status: 502 },
    )
  }
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyToBff(request, (await context.params).path)
}
