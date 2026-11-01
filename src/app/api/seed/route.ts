import { jsonResponse } from '@/lib/json'
// Provisionamento exclusivamente por CLI.
export function GET() { return jsonResponse({ error: 'Não encontrado' }, { status: 404 }) }
export const POST = GET
