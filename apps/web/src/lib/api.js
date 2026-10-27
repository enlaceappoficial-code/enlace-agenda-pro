const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

function withBase(url) {
  if (!API_BASE) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

export async function apiGet(url) {
  const res = await fetch(withBase(url), { credentials: 'include' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error('API_ERROR'), { status: res.status, data })
  return data
}

export async function apiPost(url, body) {
  const res = await fetch(withBase(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error('API_ERROR'), { status: res.status, data })
  return data
}

export async function apiPatch(url, body) {
  const res = await fetch(withBase(url), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error('API_ERROR'), { status: res.status, data })
  return data
}

export async function apiDelete(url, body) {
  const res = await fetch(withBase(url), { 
    method: 'DELETE', 
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error('API_ERROR'), { status: res.status, data })
  return data
}

