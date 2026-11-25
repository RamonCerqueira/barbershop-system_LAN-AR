import { isEvolutionConfigured } from './evolution'
import { prisma } from './prisma'
import { bookingInstant, dayRange } from './booking-rules'
import { evaluateCompanySubscription } from './subscription'
import { isMailConfigured, sendSubscriptionMail } from './mail'
import { queueMessage, processMessages, queueAdministrativeReminders } from './messages'

export const appointmentVersion = (a: { status: string; date: Date; time: string }) => `${a.status}:${a.date.toISOString().slice(0,10)}:${a.time}`
export async function processCustomerReminders(now = new Date()) {
  const appointments = await prisma.appointment.findMany({ where: { customerAccountId: { not: null }, OR: [{ date: { gte: dayRange(new Date(now.getTime()-86400000).toISOString().slice(0,10)).gte, lte: new Date(now.getTime()+4*86400000) } }, { updatedAt: { gte: new Date(now.getTime()-2*86400000) } }] }, include: { company: { include: { settings: true } }, client: true }, take: 2000, orderBy: { updatedAt: 'desc' } })
  let created = 0
  for (const a of appointments) {
    if (!a.customerAccountId || !evaluateCompanySubscription(a.company).hasAccess) continue
    const config = (a.company.settings?.notificationConfig || {}) as { customerRemindersEnabled?: boolean; reminderHours?: number }
    if (config.customerRemindersEnabled === false) continue
    const date = a.date.toISOString().slice(0,10), instant = bookingInstant(date,a.time)
    if (['SCHEDULED','CONFIRMED'].includes(a.status) && instant <= now) continue
    const hours = Math.min(72,Math.max(1,Number(config.reminderHours)||24))
    const version = appointmentVersion(a)
    const labels: Record<string,string> = { SCHEDULED:'Reserva recebida',CONFIRMED:'Atendimento confirmado',CANCELLED:'Atendimento cancelado',NO_SHOW:'Ausência registrada',COMPLETED:'Atendimento concluído',IN_PROGRESS:'Atendimento iniciado' }
    const types = [{ key:'status', title:labels[a.status] || 'Agendamento atualizado' }]
    if (['SCHEDULED','CONFIRMED'].includes(a.status) && instant > now && instant.getTime()-now.getTime() <= hours*3600000) types.push({key:'reminder',title:'Seu atendimento está chegando'})
    for (const type of types) {
      const dedupKey = `${a.id}:${version}:${type.key}`
      const alert = await prisma.customerAlert.upsert({ where:{dedupKey},update:{},create:{ customerId:a.customerAccountId, companyId:a.companyId, appointmentId:a.id, appointmentVersion:version, title:type.title, message:`${a.serviceNameSnapshot || 'Atendimento'} em ${a.company.name}, dia ${date.split('-').reverse().join('/')} às ${a.time}. Consulte o status e as condições na sua agenda.`,dedupKey } })
      if (alert.createdAt >= now) created++
    }
  }
  const pending = await prisma.customerAlert.findMany({ where:{ OR:[{emailStatus:'PENDING'},{whatsappStatus:'PENDING'}],createdAt:{gte:new Date(now.getTime()-86400000)} }, include:{customer:true}, orderBy:{createdAt:'asc'},take:200 })
  for (const job of pending) {
    if (job.appointmentId) {
      const a = await prisma.appointment.findUnique({where:{id:job.appointmentId}})
      if (!a || a.customerAccountId !== job.customerId || appointmentVersion(a) !== job.appointmentVersion) {
        await prisma.customerAlert.update({where:{id:job.id},data:{emailStatus:'CANCELLED',whatsappStatus:'CANCELLED'}});continue
      }
    }
    const company = await prisma.company.findUnique({where:{id:job.companyId},include:{settings:true}})
    if (!company || !evaluateCompanySubscription(company).hasAccess) continue
    const config = (company.settings?.notificationConfig || {}) as { customerEmailEnabled?:boolean; customerWhatsappEnabled?:boolean;customerRemindersEnabled?:boolean }
    if (config.customerRemindersEnabled === false) continue
    if (job.dedupKey.startsWith('waitlist:') && !await prisma.waitlistEntry.findFirst({where:{id:job.dedupKey.split(':')[1],customerId:job.customerId,status:'OFFERED',expiresAt:{gt:now}}})) { await prisma.customerAlert.update({where:{id:job.id},data:{emailStatus:'CANCELLED',whatsappStatus:'CANCELLED'}});continue }
    if (job.emailStatus === 'PENDING' && job.customer.reminderEmail && config.customerEmailEnabled && isMailConfigured()) {
      const claimed = await prisma.customerAlert.updateMany({where:{id:job.id,emailStatus:'PENDING'},data:{emailStatus:'SENDING'}})
      if (claimed.count) {
        try {
          await sendSubscriptionMail(job.customer.email,job.title,job.message+'\n\n'+new URL(job.href,process.env.APP_URL || 'https://barberpro.genioplay.com.br').toString())
          await prisma.customerAlert.update({where:{id:job.id},data:{emailStatus:'SENT'}})
        } catch { await prisma.customerAlert.update({where:{id:job.id},data:{emailStatus:'FAILED'}}) }
      }
    }
    if (job.whatsappStatus === 'PENDING' && job.customer.reminderWhatsapp && config.customerWhatsappEnabled && isEvolutionConfigured()) {
      try {
        // The account owner's opt-in covers transactional messages, never marketing.
        await queueMessage(job.companyId,job.customer.phone,job.title+'\n'+job.message,'customer-alert:'+job.id,undefined,undefined,job.id)
        await prisma.customerAlert.update({where:{id:job.id},data:{whatsappStatus:'QUEUED'}})
      } catch { /* Provider may be unavailable; keep pending until the alert expires. */ }
    }
  }
  if (isEvolutionConfigured()) await queueAdministrativeReminders(now)
  if (isEvolutionConfigured() || (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN)) await processMessages()
  return { examined:appointments.length,created }
}
