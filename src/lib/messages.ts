import { evaluateCompanySubscription } from './subscription'
import { planEntitlements } from './plans'
import { bookingInstant } from './booking-rules'
import { requirePlanFeature } from './entitlements'
import { connectionState, evolutionRequest, evolutionNumber, quotaMonth } from './evolution'
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
export async function queueMessage(companyId: string, to: string, message: string, key: string, campaignId?: string, clientId?: string, customerAlertId?: string, appointmentId?: string, appointmentVersion?: string) {
  await requirePlanFeature(companyId, campaignId ? 'campaigns' : 'whatsapp')
  const connection = await prisma.whatsAppConnection.findUnique({where:{companyId}})
  if (!connection) throw new HttpError(409,'Conecte o WhatsApp em Configurações.')
  if (!clientId && !customerAlertId) throw new HttpError(400,'Selecione um cliente com consentimento para WhatsApp.')
  const phone = phoneInput.parse(to)
  if (!message.trim() || message.length > 4000) throw new HttpError(400,'Mensagem inválida.')
  const company = await prisma.company.findFirst({where:{id:companyId,isActive:true}})
  if (!company) throw new HttpError(404,'Empresa indisponível.')
  if (clientId && !await prisma.client.findFirst({where:{id:clientId,companyId,phone,isActive:true,whatsappConsent:true}})) throw new HttpError(400,'Cliente sem consentimento para esta comunicação.')
  if (campaignId && !await prisma.whatsAppCampaign.findFirst({where:{id:campaignId,companyId,isActive:true}})) throw new HttpError(404,'Campanha indisponível.')
  return prisma.outboundMessage.upsert({ where:{dedupKey:digest(companyId+':'+key)},update:{},create:{companyId,instanceName:connection.instanceName,to:phone,message,clientId,campaignId,customerAlertId,appointmentId,appointmentVersion,dedupKey:digest(companyId+':'+key)} })
}

export async function queueCampaign(id: string, companyId: string) {
  await requirePlanFeature(companyId, 'campaigns')
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
  await prisma.outboundMessage.updateMany({where:{status:'SENDING',updatedAt:{lt:new Date(Date.now()-10*60_000)}},data:{status:'UNKNOWN'}})
  const pending=await prisma.outboundMessage.findMany({where:{status:'QUEUED',nextAttemptAt:{lte:new Date()}},orderBy:{createdAt:'asc'},take:50})
  for(const job of pending) {
    if (job.appointmentId) {
      const a = await prisma.appointment.findFirst({where:{id:job.appointmentId,companyId:job.companyId}})
      if (!a || !['SCHEDULED','CONFIRMED'].includes(a.status) || `${a.status}:${a.date.toISOString().slice(0,10)}:${a.time}` !== job.appointmentVersion || bookingInstant(a.date.toISOString().slice(0,10),a.time) <= new Date()) {
        await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue
      }
    }
    if (job.customerAlertId) {
      const alert = await prisma.customerAlert.findUnique({where:{id:job.customerAlertId},include:{customer:true}})
      const company = await prisma.company.findUnique({where:{id:job.companyId},include:{settings:true}})
      const config = (company?.settings?.notificationConfig || {}) as { customerRemindersEnabled?:boolean;customerWhatsappEnabled?:boolean }
      let valid = Boolean(alert && alert.customer.reminderWhatsapp && alert.customer.phone === job.to && config.customerRemindersEnabled !== false && config.customerWhatsappEnabled && alert.whatsappStatus !== 'CANCELLED' && alert.createdAt.getTime() > Date.now()-86400000)
      if (valid && alert?.appointmentId) {
        const a = await prisma.appointment.findUnique({where:{id:alert.appointmentId}})
        valid = Boolean(a && a.customerAccountId === alert.customerId && `${a.status}:${a.date.toISOString().slice(0,10)}:${a.time}` === alert.appointmentVersion)
      }
      if (valid && alert?.dedupKey.startsWith('waitlist:')) valid = Boolean(await prisma.waitlistEntry.findFirst({where:{id:alert.dedupKey.split(':')[1],customerId:alert.customerId,status:'OFFERED',expiresAt:{gt:new Date()}}}))
      if (!valid) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
    }
    if(!await prisma.company.findFirst({where:{id:job.companyId,isActive:true}})) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
    if (job.clientId && !await prisma.client.findFirst({where:{id:job.clientId,companyId:job.companyId,phone:job.to,isActive:true,whatsappConsent:true}})) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
    if (job.campaignId && !await prisma.whatsAppCampaign.findFirst({where:{id:job.campaignId,companyId:job.companyId,isActive:true}})) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
    let limit = 0
    if (job.purpose !== 'PLATFORM') {
      try {
        const entitlements = await requirePlanFeature(job.companyId,job.campaignId?'campaigns':'whatsapp')
        limit = entitlements.whatsappMonthly
        const connection = await prisma.whatsAppConnection.findUnique({where:{companyId:job.companyId}})
        if (!connection || job.instanceName !== connection.instanceName) { await prisma.outboundMessage.update({where:{id:job.id},data:{status:'CANCELLED'}});continue }
        if (await connectionState(connection.instanceName) !== 'open') { await prisma.outboundMessage.updateMany({where:{id:job.id,status:'QUEUED'},data:{nextAttemptAt:new Date(Date.now()+60000)}});continue }
      } catch { await prisma.outboundMessage.updateMany({where:{id:job.id,status:'QUEUED'},data:{nextAttemptAt:new Date(Date.now()+300000)}});continue }
    }
    const claimed = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM companies WHERE id = ${job.companyId} FOR UPDATE`
      if (job.purpose !== 'PLATFORM') {
        const company = await tx.company.findUniqueOrThrow({where:{id:job.companyId}})
        const sub = evaluateCompanySubscription(company)
        const entitlements = planEntitlements(sub.plan,sub.isTrial)
        if (!sub.hasAccess || !entitlements.features.includes(job.campaignId?'campaigns':'whatsapp')) return false
        limit = entitlements.whatsappMonthly
      }
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'whatsapp:'+job.companyId}))::text`
      const month = quotaMonth()
      const used = await tx.outboundMessage.count({where:{companyId:job.companyId,purpose:'TENANT',quotaMonth:month,OR:[{acceptedAt:{not:null}},{status:{in:['SENDING','UNKNOWN']}}]}})
      if (job.purpose !== 'PLATFORM' && used >= limit) {
        const key = 'whatsapp-quota:'+job.companyId+':'+month
        const exists = await tx.auditLog.findFirst({where:{companyId:job.companyId,action:'WHATSAPP_QUOTA_REACHED',entityId:key}})
        if (!exists) {
          await tx.auditLog.create({data:{companyId:job.companyId,actorId:'SYSTEM',action:'WHATSAPP_QUOTA_REACHED',entityId:key}})
          await tx.notification.create({data:{companyId:job.companyId,type:'SYSTEM',title:'Cota de WhatsApp atingida',message:'Os envios foram pausados até o próximo mês. Consulte Configurações para acompanhar o consumo.'}})
        }
        await tx.outboundMessage.updateMany({where:{id:job.id,status:'QUEUED'},data:{nextAttemptAt:new Date(Date.now()+3600000)}})
        return false
      }
      const claim = await tx.outboundMessage.updateMany({where:{id:job.id,status:'QUEUED'},data:{status:'SENDING',quotaMonth:month,attempts:{increment:1}}})
      return Boolean(claim.count)
    })
    if (!claimed) continue
    let definitelyRejected = false
    try {
      let id: string | undefined
      if (job.purpose === 'PLATFORM') {
        const config = providerConfig()
        const res = await fetch(config.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({to:job.to,message:job.message})})
        if (!res.ok) { definitelyRejected = res.status >= 400 && res.status < 500; throw new Error('rejected') }
        id = (await res.json()).id
      } else {
        const body = await evolutionRequest('/message/sendText/'+encodeURIComponent(job.instanceName!),'POST',{number:evolutionNumber(job.to),text:job.message,linkPreview:false})
        id = body.key?.id
      }
      if (typeof id !== 'string' || !id) throw new Error('missing-provider-id')
      await prisma.$transaction(async tx => {
        await tx.outboundMessage.update({where:{id:job.id},data:{status:'SENT',providerId:id,acceptedAt:new Date()}})
        if (job.campaignId && job.clientId) await tx.whatsAppCampaignLog.create({data:{campaignId:job.campaignId,clientId:job.clientId,status:'SENT'}})
      })
    } catch {
      // A timeout can occur after acceptance. Never blindly resend an ambiguous send.
      await prisma.outboundMessage.update({where:{id:job.id},data:{status:definitelyRejected?'FAILED':'UNKNOWN'}})
    }
  }
  return { examined: pending.length }
}

// SaaS billing messages always use the platform provider, never the tenant's number.
export async function queuePlatformMessage(companyId: string, to: string, message: string, key: string) {
  providerConfig()
  const phone = phoneInput.parse(to)
  return prisma.outboundMessage.upsert({where:{dedupKey:digest(companyId+':'+key)},update:{},create:{companyId,to:phone,message,purpose:'PLATFORM',dedupKey:digest(companyId+':'+key)}})
}

export async function queueAdministrativeReminders(now = new Date()) {
  const appointments = await prisma.appointment.findMany({where:{customerAccountId:null,status:{in:['SCHEDULED','CONFIRMED']},date:{gte:new Date(now.getTime()-86400000),lte:new Date(now.getTime()+4*86400000)},client:{isActive:true,whatsappConsent:true},company:{isActive:true}},include:{client:true,company:{include:{settings:true}}},take:1000,orderBy:{date:'asc'}})
  for (const a of appointments) {
    const date = a.date.toISOString().slice(0,10)
    const instant = bookingInstant(date,a.time)
    if (instant <= now) continue
    const config = (a.company.settings?.whatsappConfig || {}) as {autoSendConfirmation?:boolean;autoSendReminder?:boolean;reminderHours?:number}
    const version = `${a.status}:${date}:${a.time}`
    const kinds: string[] = []
    if (config.autoSendConfirmation !== false) kinds.push('confirmation')
    if (config.autoSendReminder !== false && instant.getTime()-now.getTime() <= Math.max(1,Math.min(72,Number(config.reminderHours)||24))*3600000) kinds.push('reminder')
    for (const kind of kinds) {
      const title = kind === 'reminder' ? 'Seu atendimento está chegando' : a.status === 'CONFIRMED' ? 'Atendimento confirmado' : 'Reserva recebida'
      try { await queueMessage(a.companyId,a.client.phone,`${title}: ${a.serviceNameSnapshot || 'Atendimento'} em ${a.company.name}, dia ${date.split('-').reverse().join('/')} às ${a.time}.`,'appointment:'+a.id+':'+version+':'+kind,undefined,a.clientId,undefined,a.id,version) } catch { /* A disconnected or unpaid company cannot enqueue. */ }
    }
  }
}
