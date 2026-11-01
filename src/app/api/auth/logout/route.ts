import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/security'
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? verifyToken(token) : null
  if (payload?.sessionId) await prisma.authSession.updateMany({ where: { id: payload.sessionId, subjectId: payload.id }, data: { revokedAt: new Date() } })
  const response = jsonResponse({ success: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  return response
}
