import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { getCompanySubscriptionStatus } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const status = await getCompanySubscriptionStatus(auth.companyId)
    return jsonResponse(status, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apiError(error)
  }
}
