import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { updateBooking, formatAppointment } from '@/lib/bookings'
import { apiError } from '@/lib/http'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    return jsonResponse(formatAppointment(await updateBooking((await params).id,auth.companyId,await request.json())))
  } catch (error) { return apiError(error) }
}
export const PUT = PATCH
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    await updateBooking((await params).id,auth.companyId,{ status: 'CANCELLED' })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
