import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { createBooking } from '@/lib/bookings'
import { apiError, HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'

// Telefone digitado no navegador não comprova a titularidade de um histórico.
export function GET() { return jsonResponse({ error: 'Verifique sua identidade para acessar o histórico.' }, { status: 401 }) }
export async function POST(request: NextRequest) {
  try {
    await rateLimit(request,'public-booking','',20)
    const body = await request.json()
    if (typeof body.companyId !== 'string' || !body.companyId) throw new HttpError(400,'Empresa obrigatória.')
    const result = await createBooking(body,body.companyId,request.headers.get('idempotency-key'),true)
    const a = result.appointment
    return jsonResponse({ id: a.id, date: a.date.toISOString().slice(0,10), time: a.time, price: a.price, status: a.status, service: a.service.name, barber: a.employee.name,
      confirmationUrl: result.confirmationToken ? '/confirm/' + a.id + '?token=' + result.confirmationToken : undefined,
      repeated: result.repeated }, { status: result.repeated ? 200 : 201 })
  } catch (error) { return apiError(error) }
}
