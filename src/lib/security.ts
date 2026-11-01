import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'barberpro_token'
export const SESSION_SECONDS = 60 * 60 * 12
export function jwtSecret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 48 || /your-|secret-jwt-key|change.me/i.test(value)) throw new Error('Configure JWT_SECRET com pelo menos 48 caracteres aleatórios.')
  return value
}
export const opaqueToken = () => randomBytes(32).toString('hex')
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export const sessionCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_SECONDS })
