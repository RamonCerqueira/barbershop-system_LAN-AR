import { prisma } from './prisma'
import { digest } from './security'
import { HttpError } from './http'

export async function rateLimit(request: Request, scope: string, identifier = '', max = 10, seconds = 900) {
  // Endereços encaminhados só são confiáveis quando o proxy é controlado pela instalação.
  const ip = process.env.TRUST_PROXY === 'true' ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'shared'
  const key = digest(`${scope}:${ip}:${identifier}:${Math.floor(Date.now() / (seconds * 1000))}`)
  const result = await prisma.rateLimitBucket.upsert({ where: { id: key }, create: { id: key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) }, update: { count: { increment: 1 } } })
  if (result.count > max) throw new HttpError(429, 'Muitas tentativas. Aguarde e tente novamente.')
}
