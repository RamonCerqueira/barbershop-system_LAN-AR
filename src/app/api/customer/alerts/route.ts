import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'

export async function GET(request: NextRequest) {
  try {
    const c = await requireCustomer(request)
    const items = await prisma.customerAlert.findMany({where:{customerId:c.id},orderBy:{createdAt:'desc'},take:50,select:{id:true,title:true,message:true,href:true,readAt:true,createdAt:true}})
    return jsonResponse({items,preferences:{email:c.reminderEmail,whatsapp:c.reminderWhatsapp}})
  } catch(e){return apiError(e)}
}
export async function PATCH(request: NextRequest) {
  try {
    const c = await requireCustomer(request)
    const data = z.object({readId:z.string().optional(),email:z.boolean().optional(),whatsapp:z.boolean().optional()}).parse(await request.json())
    if (data.readId) await prisma.customerAlert.updateMany({where:{id:data.readId,customerId:c.id},data:{readAt:new Date()}})
    if (data.email !== undefined || data.whatsapp !== undefined) await prisma.customerAccount.update({where:{id:c.id},data:{reminderEmail:data.email,reminderWhatsapp:data.whatsapp}})
    return jsonResponse({success:true})
  } catch(e){return apiError(e)}
}
