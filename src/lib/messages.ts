import { prisma } from './prisma'
import { HttpError } from './http'
import { phoneInput } from './validation'
import { digest } from './security'

function providerConfig() {
  if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) throw new HttpError(503,'WhatsApp indisponível: configure o provedor no servidor.')
  const url = new URL(process.env.WHATSAPP_API_URL)
  const allowed = (process.env.WHATSAPP_ALLOWED_HOSTS || '').split(',').map(v=>v.trim()).filter(Boolean)
  if (url.protocol !== 'https:' || url.username || url.password || !allowed.includes(url.hostname)) throw new HttpError(503,'Configure o endereço HTTPS e a lista de hosts do provedor.')
  return { url: url.toString(), token: process.env.WHATSAPP_API_TOKEN }
}
export async function queueMessage(companyId: string, to: string, message: string, key: string, campaignId?: string, clientId?: string) {
  providerConfig()
  const phone = phoneInput.parse(to)
  if (!message.trim() || message.length > 4000) throw new HttpError(400,'Mensagem inválida.')
  const company = await prisma.company.findFirst({where:{id:companyId,isActive:true}})
  if (!company) throw new HttpError(404,'Empresa indisponível.')
  if (clientId && !await prisma.client.findFirst({where:{id:clientId,companyId,isActive:true,whatsappConsent:true}})) throw new HttpError(400,'Cliente sem consentimento para esta comunicação.')
  if (campaignId && !await prisma.whatsAppCampaign.findFirst({where:{id:campaignId,companyId,isActive:true}})) throw new HttpError(404,'Campanha indisponível.')
  return prisma.outboundMessage.upsert({ where:{dedupKey:digest(companyId+':'+key)},update:{},create:{companyId,to:phone,message,clientId,campaignId,dedupKey:digest(companyId+':'+key)} })
}

export async function queueCampaign(id: string, companyId: string) {
  providerConfig()
  const campaign = await prisma.whatsAppCampaign.findFirst({where:{id,companyId,isActive:true,company:{isActive:true}},include:{company:true}})
  if (!campaign) throw new HttpError(404,'Campanha indisponível.')
  const clients = await prisma.client.findMany({where:{companyId,isActive:true,whatsappConsent:true},include:{appointments:{where:{status:'COMPLETED'},orderBy:{date:'desc'},take:1}}})
  let queuedCount=0
  for(const client of clients) {
    const visit=client.appointments[0]
    if(!visit)continue
    const days=Math.floor((Date.now()-visit.date.getTime())/86_400_000)
    if(days<campaign.triggerDays)continue
    const key='campaign:'+id+':'+client.id+':'+visit.id
    const existing=await prisma.outboundMessage.findUnique({where:{dedupKey:digest(companyId+':'+key)}})
    if(existing)continue
    await queueMessage(companyId,client.phone,campaign.message.replace(/\{nome\}/gi,client.fullName).replace(/\{dias\}/gi,String(days)).replace(/\{barbearia\}/gi,campaign.company.name),key,id,client.id)
    queuedCount++
  }
  return { queuedCount, sentCount: 0, message: 'Mensagens elegíveis colocadas na fila. Entrega depende do provedor.' }
}

export async function processMessages() {
  const config=providerConfig()
  await prisma.outboundMessage.updateMany({where:{status:'SENDING',updatedAt:{lt:new Date(Date.now()-10*60_000)}},data:{status:'QUEUED'}})
  const pending=await prisma.outboundMessage.findMany({where:{status:'QUEUED',nextAttemptAt:{lte:new Date()}},orderBy:{createdAt:'asc'},take:50})
  for(const job of pending) {
    if(!await prisma.company.findFirst({where:{id:job.companyId,isActive:true}})) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
    const claim=await prisma.outboundMessage.updateMany({where:{id:job.id,status:'QUEUED'},data:{status:'SENDING',attempts:{increment:1}}})
    if(!claim.count)continue
    try {
      const res=await fetch(config.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10_000),headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({to:job.to,message:job.message})})
      if(!res.ok)throw new Error('provider-rejected')
      const body=await res.json()
      if(typeof body.id!=='string'||!body.id)throw new Error('missing-provider-id')
      await prisma.$transaction(async tx=>{
        await tx.outboundMessage.update({where:{id:job.id},data:{status:'SENT',providerId:body.id}})
        if(job.campaignId&&job.clientId)await tx.whatsAppCampaignLog.create({data:{campaignId:job.campaignId,clientId:job.clientId,status:'SENT'}})
      })
    } catch {
      await prisma.outboundMessage.update({where:{id:job.id},data:{status:job.attempts>=4?'FAILED':'QUEUED',nextAttemptAt:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000)}})
    }
  }
  return { examined: pending.length }
}
