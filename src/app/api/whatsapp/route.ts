import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { requirePlanFeature } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { connectionState, connectEvolution, evolutionRequest, isEvolutionConfigured, whatsappUsage } from '@/lib/evolution'

async function admin(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth?.companyId || auth.role !== 'ADMIN') throw new HttpError(403,'Somente o administrador pode gerenciar a conexão.')
  const entitlements = await requirePlanFeature(auth.companyId,'whatsapp')
  return {actorId:auth.id,companyId:auth.companyId,limit:entitlements.whatsappMonthly}
}
export async function GET(request: NextRequest) {
  try {
    const auth = await admin(request)
    const connection = await prisma.whatsAppConnection.findUnique({where:{companyId:auth.companyId}})
    const [used, uncertain, uncertainMessages] = await Promise.all([whatsappUsage(auth.companyId),prisma.outboundMessage.count({where:{companyId:auth.companyId,purpose:'TENANT',status:'UNKNOWN'}}),prisma.outboundMessage.findMany({where:{companyId:auth.companyId,purpose:'TENANT',status:'UNKNOWN'},select:{id:true,to:true,message:true,createdAt:true},orderBy:{createdAt:'desc'},take:10})])
    const state = !isEvolutionConfigured() ? 'unavailable' : connection ? await connectionState(connection.instanceName) : 'absent'
    return jsonResponse({state,used,limit:auth.limit,uncertain,uncertainMessages},{headers:{'Cache-Control':'no-store'}})
  } catch(e) { return apiError(e) }
}
export async function POST(request: NextRequest) {
  try {
    const auth = await admin(request)
    await rateLimit(request,'whatsapp-connect',auth.companyId,10,60)
    const body = z.discriminatedUnion('action',[
      z.object({action:z.enum(['CONNECT','DISCONNECT'])}),
      z.object({action:z.literal('RESOLVE_UNCERTAIN'),id:z.string().min(1),sent:z.boolean()})
    ]).parse(await request.json())
    const {action} = body
    if (body.action === 'RESOLVE_UNCERTAIN') {
      await prisma.$transaction(async tx=>{
        const job = await tx.outboundMessage.findFirst({where:{id:body.id,companyId:auth.companyId,purpose:'TENANT',status:'UNKNOWN'}})
        if (!job) throw new HttpError(404,'Envio incerto não encontrado.')
        const changed = await tx.outboundMessage.updateMany({where:{id:job.id,status:'UNKNOWN'},data:{status:body.sent?'SENT':'FAILED',acceptedAt:body.sent?job.updatedAt:null}})
        if (changed.count) await tx.auditLog.create({data:{companyId:auth.companyId,actorId:auth.actorId,entityId:job.id,action:body.sent?'WHATSAPP_MANUALLY_CONFIRMED':'WHATSAPP_MANUALLY_NOT_SENT'}})
      })
      return jsonResponse({resolved:true})
    }
    const connection = await prisma.whatsAppConnection.findUnique({where:{companyId:auth.companyId}})
    if (action === 'CONNECT') {
      const result = await connectEvolution(auth.companyId)
      const settings = await prisma.companySettings.findUnique({where:{companyId:auth.companyId}})
      if (settings) await prisma.companySettings.update({where:{companyId:auth.companyId},data:{notificationConfig:{...((settings.notificationConfig||{}) as Record<string,unknown>),customerWhatsappEnabled:true}}})
      return jsonResponse(result,{headers:{'Cache-Control':'no-store'}})
    }
    if (connection) {
      const state = await connectionState(connection.instanceName)
      if (state !== 'absent') await evolutionRequest('/instance/logout/'+encodeURIComponent(connection.instanceName),'DELETE')
      await prisma.outboundMessage.updateMany({where:{companyId:auth.companyId,purpose:'TENANT',status:'QUEUED'},data:{status:'CANCELLED'}})
    }
    return jsonResponse({state:'close'},{headers:{'Cache-Control':'no-store'}})
  } catch(e) { return apiError(e) }
}
