import { NextRequest } from 'next/server'
import { signupContract } from '@/lib/contracts'
import { isAvailablePlan } from '@/lib/plans'
import { jsonResponse } from '@/lib/json'
export function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') || 'MONTHLY'
  if (!isAvailablePlan(plan)) return jsonResponse({error:'Plano inválido.'},{status:400})
  return jsonResponse(signupContract(plan),{headers:{'Cache-Control':'no-store'}})
}
