import { NextRequest } from 'next/server'
import { requireCustomer } from '@/lib/customer-auth'
import { depositPolicy,DepositConfig } from '@/lib/operations'
import { prisma } from '@/lib/prisma'
import { apiError,HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'

export async function GET(request:NextRequest) {
  try {
    const c=await requireCustomer(request),companyId=request.nextUrl.searchParams.get('companyId')||'',serviceId=request.nextUrl.searchParams.get('serviceId')||''
    const [s,client,service]=await Promise.all([prisma.companySettings.findUnique({where:{companyId}}),prisma.client.findFirst({where:{companyId,customerAccountId:c.id,isActive:true}}),prisma.service.findFirst({where:{id:serviceId,companyId,isActive:true}})])
    if(!s||!service)throw new HttpError(404,'Serviço indisponível.')
    const policy=await depositPolicy(prisma,companyId,client,service.price,s.appointmentConfig as DepositConfig)
    return jsonResponse({required:policy.required,amount:policy.amount})
  }catch(e){return apiError(e)}
}
