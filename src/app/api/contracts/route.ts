import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { commercialContract } from '@/lib/contracts'
import { isAvailablePlan } from '@/lib/plans'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId || auth.role!=='ADMIN') throw new HttpError(403,'Somente o administrador pode consultar e aceitar contratos.')
    const plan = request.nextUrl.searchParams.get('plan')
    if (plan) {
      if (!isAvailablePlan(plan)) throw new HttpError(400,'Plano inválido.')
      const company = await prisma.company.findUniqueOrThrow({where:{id:auth.companyId}})
      return jsonResponse(commercialContract(company,plan,auth),{headers:{'Cache-Control':'no-store'}})
    }
    const documents = await prisma.contractAcceptance.findMany({where:{companyId:auth.companyId},orderBy:{acceptedAt:'desc'},take:100,include:{payment:{select:{status:true,periodStart:true,periodEnd:true}}}})
    return jsonResponse(documents,{headers:{'Cache-Control':'no-store'}})
  } catch(e) { return apiError(e) }
}
