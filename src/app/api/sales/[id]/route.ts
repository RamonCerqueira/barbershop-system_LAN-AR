import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { transitionSale } from '@/lib/sales'
import { apiError, HttpError } from '@/lib/http'
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) throw new HttpError(401,'Não autorizado')
    return jsonResponse(await transitionSale((await params).id,auth.companyId,auth.id,await request.json()))
  } catch (error) { return apiError(error) }
}
export function DELETE() { return jsonResponse({ error: 'Vendas não podem ser excluídas. Registre um estorno com motivo.' }, { status: 405 }) }
