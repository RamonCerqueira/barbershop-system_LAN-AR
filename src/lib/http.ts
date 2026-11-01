import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { randomUUID } from 'node:crypto'

export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
  const code = (error as { code?: string })?.code
  if (code === 'P2002') return NextResponse.json({ error: 'Registro ou operação já existente' }, { status: 409 })
  if (code === 'P2034' || code === '23P01') return NextResponse.json({ error: 'Conflito simultâneo. Atualize os dados e tente novamente.' }, { status: 409 })
  const incident = randomUUID()
  console.error(JSON.stringify({ event: 'request_failed', incident, code: code || 'INTERNAL' }))
  return NextResponse.json({ error: 'Erro interno. Tente novamente.', incident }, { status: 500 })
}
