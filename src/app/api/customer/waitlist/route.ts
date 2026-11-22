import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { dateInput,timeInput } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { waitlistAvailability } from '@/lib/waitlist'

export async function GET(request: NextRequest) {
  try {
    const c = await requireCustomer(request)
    const items = await prisma.waitlistEntry.findMany({where:{customerId:c.id},include:{company:{select:{name:true}}},orderBy:{createdAt:'desc'},take:100})
    return jsonResponse(items.map(e=>({id:e.id,companyName:e.company.name,date:e.date,time:e.time,status:e.status,expiresAt:e.expiresAt,href:`/cliente/barbearia/${e.companyId}?${new URLSearchParams({service:e.serviceId,professional:e.employeeId,date:e.date,time:e.time})}`})))
  } catch(e){return apiError(e)}
}
export async function POST(request: NextRequest) {
  try {
    const c = await requireCustomer(request)
    await rateLimit(request,'waitlist',c.id,20,3600)
    const data = z.object({companyId:z.string().min(1),serviceId:z.string().min(1),employeeId:z.string().min(1),date:dateInput,time:timeInput}).parse(await request.json())
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'waitlist-customer:'+c.id}))::text`
      await waitlistAvailability(tx,data,false)
      const key = {customerId:c.id,...data}
      const existing = await tx.waitlistEntry.findUnique({where:{customerId_companyId_serviceId_employeeId_date_time:key}})
      if (existing && ['WAITING','OFFERED'].includes(existing.status)) return
      if (await tx.waitlistEntry.count({where:{customerId:c.id,status:{in:['WAITING','OFFERED']}}})>=10) throw new HttpError(400,'Você já acompanha dez horários. Remova uma solicitação antes de adicionar outra.')
      await tx.waitlistEntry.upsert({where:{customerId_companyId_serviceId_employeeId_date_time:key},update:{status:'WAITING',offeredAt:null,expiresAt:null,createdAt:new Date()},create:key})
    })
    return jsonResponse({success:true},{status:201})
  } catch(e){return apiError(e)}
}
export async function DELETE(request: NextRequest) {
  try {
    const c = await requireCustomer(request)
    const {id}=z.object({id:z.string().min(1)}).parse(await request.json())
    const changed=await prisma.waitlistEntry.updateMany({where:{id,customerId:c.id,status:{in:['WAITING','OFFERED']}},data:{status:'CANCELLED'}})
    if(!changed.count)throw new HttpError(404,'Solicitação não encontrada.')
    return jsonResponse({success:true})
  } catch(e){return apiError(e)}
}
