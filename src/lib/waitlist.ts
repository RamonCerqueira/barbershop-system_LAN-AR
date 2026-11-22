import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { assertAvailable, BookingSettings, dayRange, minuteOfDay } from './booking-rules'
import { evaluateCompanySubscription } from './subscription'
import { HttpError } from './http'

export async function waitlistAvailability(tx: Prisma.TransactionClient, entry: { companyId:string;employeeId:string;serviceId:string;date:string;time:string }, checkOccupied = true) {
  const company = await tx.company.findUnique({where:{id:entry.companyId},include:{settings:true}})
  const service = await tx.service.findFirst({where:{id:entry.serviceId,companyId:entry.companyId,isActive:true}})
  const employee = await tx.employee.findFirst({where:{id:entry.employeeId,companyId:entry.companyId,isActive:true,role:{in:['BARBER','MASSAGE','PODIATRY']}}})
  if (!company?.settings || !service || !employee || !evaluateCompanySubscription(company).hasAccess) throw new HttpError(409,'Barbearia, serviço ou profissional indisponível.')
  const blocks = await tx.employeeBlock.findMany({where:{companyId:entry.companyId,employeeId:entry.employeeId,date:entry.date}})
  const occupied = checkOccupied ? await tx.appointment.findMany({where:{companyId:entry.companyId,employeeId:entry.employeeId,date:dayRange(entry.date),status:{notIn:['CANCELLED','NO_SHOW']}},select:{time:true,duration:true}}) : []
  assertAvailable(entry.date,entry.time,service.duration,company.settings as unknown as BookingSettings,[...occupied,...blocks.map(b=>({time:b.startTime,duration:minuteOfDay(b.endTime)-minuteOfDay(b.startTime)}))])
  return {company,service,employee}
}

export async function processWaitlist(now = new Date()) {
  await prisma.waitlistEntry.updateMany({where:{status:'OFFERED',expiresAt:{lte:now}},data:{status:'EXPIRED'}})
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  await prisma.waitlistEntry.updateMany({where:{status:{in:['WAITING','OFFERED']},date:{lt:today}},data:{status:'EXPIRED'}})
  const pending = await prisma.waitlistEntry.findMany({where:{status:'WAITING',date:{gte:today}},orderBy:{createdAt:'asc'},take:500})
  let offered = 0
  for (const entry of pending) {
    try {
      await prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${entry.companyId}),hashtext(${'schedule:all'}))::text`
        const current = await tx.waitlistEntry.findUnique({where:{id:entry.id}})
        if (!current || current.status !== 'WAITING') return
        const {company,service,employee} = await waitlistAvailability(tx,entry)
        const existing = await tx.waitlistEntry.findFirst({where:{companyId:entry.companyId,employeeId:entry.employeeId,date:entry.date,time:entry.time,status:'OFFERED',expiresAt:{gt:now}}})
        if (existing) return
        const expiresAt = new Date(now.getTime()+15*60000)
        await tx.waitlistEntry.update({where:{id:entry.id},data:{status:'OFFERED',offeredAt:now,expiresAt}})
        const href = `/cliente/barbearia/${entry.companyId}?${new URLSearchParams({service:entry.serviceId,professional:entry.employeeId,date:entry.date,time:entry.time})}`
        await tx.customerAlert.create({data:{customerId:entry.customerId,companyId:entry.companyId,title:'Um horário da sua lista ficou disponível',message:`${service.name} com ${employee.name} em ${company.name}, ${entry.date.split('-').reverse().join('/')} às ${entry.time}. Confira em até 15 minutos. O aviso não reserva a vaga: ela depende da confirmação e pode ser ocupada.`,href,dedupKey:'waitlist:'+entry.id+':'+entry.createdAt.toISOString()}})
        offered++
      })
    } catch (e) { if (!(e instanceof HttpError)) throw e }
  }
  return {examined:pending.length,offered}
}
