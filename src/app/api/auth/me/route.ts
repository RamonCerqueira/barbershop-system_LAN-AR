import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
  const publicUser = { id: user.id, email: user.email, name: user.name, type: user.type, role: user.role, companyId: user.companyId, companyName: user.companyName }
  return jsonResponse({ user: publicUser }, { headers: { 'Cache-Control': 'no-store' } })
}
