import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
export async function POST(request: NextRequest) {
  try {
    const secret=process.env.WHATSAPP_WEBHOOK_SECRET
    const signature=request.headers.get('x-webhook-signature') || ''
    if(!secret||!/^[a-f0-9]{64}$/.test(signature))throw new HttpError(401,'Assinatura inválida.')
    const raw=await request.text()
    if(raw.length>65536)throw new HttpError(413,'Requisição muito grande.')
    const expected=createHmac('sha256',secret).update(raw).digest()
    if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new HttpError(401,'Assinatura inválida.')
    const body=z.object({id:z.string().min(1),status:z.enum(['SENT','DELIVERED','READ','FAILED'])}).parse(JSON.parse(raw))
    const job=await prisma.outboundMessage.findUnique({where:{providerId:body.id}})
    if(job){
      const order:Record<string,number>={SENT:1,DELIVERED:2,READ:3}
      const advance=body.status==='FAILED'?job.status==='SENT':(order[body.status]||0)>(order[job.status]||0)
      if(advance)await prisma.$transaction(async tx=>{
        const changed=await tx.outboundMessage.updateMany({where:{id:job.id,status:job.status},data:{status:body.status}})
        if(changed.count&&job.campaignId&&job.clientId)await tx.whatsAppCampaignLog.create({data:{campaignId:job.campaignId,clientId:job.clientId,status:body.status}})
      })
    }
    return jsonResponse({received:true})
  }catch(error){return apiError(error)}
}
