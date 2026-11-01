import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// API v1 keeps money as JSON numbers for the existing clients; storage and
// server calculations use PostgreSQL NUMERIC/Decimal, with two decimal places.
function serialize(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) return Number(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,v]) => [key,serialize(v)]))
  return value
}
export function jsonResponse(value: unknown, init?: ResponseInit) { return NextResponse.json(serialize(value),init) }
