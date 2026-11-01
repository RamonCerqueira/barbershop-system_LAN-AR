import { NextRequest, NextResponse } from 'next/server'

async function verifiedPayload(token: string) {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret || secret.length < 48) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])))
    if (header.alg !== 'HS256') return null
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    if (!await crypto.subtle.verify('HMAC', key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))) return null
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])))
    if (!payload.exp || payload.exp * 1000 <= Date.now() || payload.iss !== 'barberpro' || payload.aud !== 'barberpro-web' || !payload.sessionId || !['SYSTEM_OWNER', 'COMPANY_USER'].includes(payload.type)) return null
    return payload
  } catch { return null }
}
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && path !== '/api/webhooks/whatsapp') {
      const expected = new URL(process.env.APP_URL || request.url).origin
      if (request.headers.get('origin') !== expected) return NextResponse.json({ error: 'Origem não autorizada' }, { status: 403 })
      if (Number(request.headers.get('content-length') || 0) > 2_000_000) return NextResponse.json({ error: 'Requisição muito grande' }, { status: 413 })
    }
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
  const token = request.cookies.get('barberpro_token')?.value
  const payload = token ? await verifiedPayload(token) : null
  if (!payload) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', path)
    const response = NextResponse.redirect(url)
    response.cookies.delete('barberpro_token')
    return response
  }
  if (path.startsWith('/admin') && payload.type !== 'SYSTEM_OWNER') return NextResponse.redirect(new URL('/dashboard', request.url))
  if (path.startsWith('/dashboard') && payload.type !== 'COMPANY_USER') return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.next()
}
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*'] }
