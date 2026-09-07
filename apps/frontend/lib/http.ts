export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<{
  ok: boolean
  status: number
  data: T | null
}> {
  const res = await fetch(input, init)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return { ok: false, status: res.status, data: null }
  }
  try {
    const data = (await res.json()) as T
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: res.status, data: null }
  }
}

export function shuffleInPlace<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = copy[i]
    copy[i] = copy[j] as T
    copy[j] = current as T
  }
  return copy
}
