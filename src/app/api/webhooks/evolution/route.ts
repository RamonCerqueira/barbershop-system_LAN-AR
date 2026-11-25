import { timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.EVOLUTION_WEBHOOK_SECRET || ''
    const actual = request.headers.get('x-evolution-secret') || ''
    if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) throw new HttpError(401,'Evento não autorizado.')
    const raw = await request.text()
    if (raw.length > 65536) throw new HttpError(413,'Evento muito grande.')
    const event = z.object({instance:z.string().min(1).max(100),event:z.string().max(80),data:z.unknown()}).parse(JSON.parse(raw))
    const connection = await prisma.whatsAppConnection.findUnique({where:{instanceName:event.instance}})
    if (!connection) throw new HttpError(404,'Conexão não encontrada.')
    if (event.event !== 'messages.update') return jsonResponse({received:true})
    const entries = Array.isArray(event.data) ? event.data : [event.data]
    for (const entry of entries.slice(0,100)) {
      const parsed = z.object({key:z.object({id:z.string().optional()}).optional(),keyId:z.string().optional(),status:z.union([z.string(),z.number()]).optional(),update:z.object({status:z.union([z.string(),z.number()]).optional()}).optional()}).safeParse(entry)
      if (!parsed.success) continue
      const data = parsed.data
      const id = data.keyId || data.key?.id
      const rawStatus = data.status ?? data.update?.status
      const status = ({'2':'SENT','3':'DELIVERED','4':'READ',SERVER_ACK:'SENT',DELIVERY_ACK:'DELIVERED',READ:'READ'} as Record<string,string>)[String(rawStatus)]
      if (!id || !status) continue
      const job = await prisma.outboundMessage.findFirst({where:{companyId:connection.companyId,instanceName:event.instance,providerId:id,purpose:'TENANT'}})
      const order: Record<string,number> = {SENT:1,DELIVERED:2,READ:3}
      if (job && (order[status] || 0) > (order[job.status] || 0)) await prisma.outboundMessage.updateMany({where:{id:job.id,status:job.status},data:{status,acceptedAt:job.acceptedAt || new Date()}})
    }
    return jsonResponse({received:true})
  } catch(e) { return apiError(e) }
}
