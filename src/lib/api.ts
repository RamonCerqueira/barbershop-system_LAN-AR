export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if ((options.method || "GET").toUpperCase() === "POST" && !headers.has("Idempotency-Key")) headers.set("Idempotency-Key", crypto.randomUUID())
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })

  if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
    const path = window.location.pathname
    if (response.status === 403) {
      const rawUser = localStorage.getItem('user')
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser)
          if (user.type === 'SYSTEM_OWNER' && path.startsWith('/dashboard')) {
            window.location.href = '/admin'
            return response
          }
          if (user.type === 'COMPANY_USER' && path.startsWith('/admin')) {
            window.location.href = '/dashboard'
            return response
          }
        } catch {
          // ignore parse error
        }
      }
    }
    if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  return response
}

