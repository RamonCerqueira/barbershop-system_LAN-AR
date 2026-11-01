import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/json'
import { getAuthUser } from '@/lib/auth'
import { queueMessage } from '@/lib/messages'
import { apiError, HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
export async function POST(request: NextRequest) {
  try {
    const auth=await getAuthUser(request)
    if(!auth?.companyId)throw new HttpError(401,'Não autorizado')
    await rateLimit(request,'whatsapp',auth.companyId,30)
    const body=z.object({to:z.string(),message:z.string().max(4000),campaignId:z.string().optional(),clientId:z.string().optional()}).parse(await request.json())
    const key=request.headers.get('idempotency-key')
    if(!key||key.length>100)throw new HttpError(400,'Chave de operação obrigatória.')
    const job=await queueMessage(auth.companyId,body.to,body.message,key,body.campaignId,body.clientId)
    return jsonResponse({success:true,status:job.status,id:job.id,message:'Mensagem na fila.'},{status:202})
  }catch(error){return apiError(error)}
}
