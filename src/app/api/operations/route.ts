import { isEvolutionConfigured } from '@/lib/evolution'
import { requirePlanFeature } from '@/lib/entitlements'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireOperator } from '@/lib/operations'
import { prisma } from '@/lib/prisma'
import { apiError,HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { isMailConfigured } from '@/lib/mail'

export async function GET(request:NextRequest) {
  try {
    const auth=await requireOperator(request)
    const [settings,clients,completed,waitlist]=await Promise.all([
      prisma.companySettings.findUnique({where:{companyId:auth.companyId}}),
      prisma.client.findMany({where:{companyId:auth.companyId,OR:[{requireDeposit:true},{appointments:{some:{status:'NO_SHOW'}}}]},select:{id:true,fullName:true,requireDeposit:true,_count:{select:{appointments:{where:{status:'NO_SHOW'}}}}},take:200,orderBy:{fullName:'asc'}}),
      prisma.appointment.findMany({where:{companyId:auth.companyId,status:'COMPLETED'},select:{id:true,date:true,time:true,client:{select:{fullName:true}},serviceNameSnapshot:true},orderBy:{date:'desc'},take:100}),
      prisma.waitlistEntry.findMany({where:{companyId:auth.companyId,status:{in:['WAITING','OFFERED']}},select:{id:true,date:true,time:true,status:true,customer:{select:{name:true}}},orderBy:{createdAt:'asc'},take:100})
    ])
    const reminders=(settings?.notificationConfig||{}) as Record<string,unknown>
    const config=(settings?.appointmentConfig||{}) as Record<string,unknown>
    return jsonResponse({config:{noShowDepositEnabled:Boolean(config.noShowDepositEnabled),noShowThreshold:Number(config.noShowThreshold)||2,depositPercent:Number(config.depositPercent)||30,customerRemindersEnabled:reminders.customerRemindersEnabled!==false,reminderHours:Number(reminders.reminderHours)||24,customerEmailEnabled:Boolean(reminders.customerEmailEnabled),customerWhatsappEnabled:Boolean(reminders.customerWhatsappEnabled)},providers:{email:isMailConfigured(),whatsapp:isEvolutionConfigured()},clients,completed,waitlist})
  }catch(e){return apiError(e)}
}
export async function PATCH(request:NextRequest) {
  try {
    const auth=await requireOperator(request)
    const data=z.discriminatedUnion('action',[
      z.object({action:z.literal('CONFIG'),noShowDepositEnabled:z.boolean(),noShowThreshold:z.number().int().min(1).max(20),depositPercent:z.number().int().min(1).max(100),customerRemindersEnabled:z.boolean(),reminderHours:z.number().int().min(1).max(72),customerEmailEnabled:z.boolean(),customerWhatsappEnabled:z.boolean()}),
      z.object({action:z.literal('CLIENT_DEPOSIT'),clientId:z.string().min(1),required:z.boolean()})
    ]).parse(await request.json())
    if (data.action==='CONFIG' && data.customerWhatsappEnabled) await requirePlanFeature(auth.companyId,'whatsapp')
    await prisma.$transaction(async tx=>{
      const s=await tx.companySettings.findUnique({where:{companyId:auth.companyId}})
      if(!s)throw new HttpError(409,'Configure os horários da empresa primeiro.')
      const config=(s.appointmentConfig||{}) as Record<string,unknown>
      if((data.action==='CONFIG'&&data.noShowDepositEnabled || data.action==='CLIENT_DEPOSIT'&&data.required)&&!config.pixKey)throw new HttpError(400,'Cadastre a chave PIX em Configurações antes de exigir sinal.')
      if(data.action==='CLIENT_DEPOSIT'){
        const updated=await tx.client.updateMany({where:{id:data.clientId,companyId:auth.companyId},data:{requireDeposit:data.required}})
        if(!updated.count)throw new HttpError(404,'Cliente não encontrado.')
      } else await tx.companySettings.update({where:{companyId:auth.companyId},data:{appointmentConfig:{...config,noShowDepositEnabled:data.noShowDepositEnabled,noShowThreshold:data.noShowThreshold,depositPercent:data.depositPercent},notificationConfig:{...((s.notificationConfig||{}) as Record<string,unknown>),customerRemindersEnabled:data.customerRemindersEnabled,reminderHours:data.reminderHours,customerEmailEnabled:data.customerEmailEnabled,customerWhatsappEnabled:data.customerWhatsappEnabled}}})
      await tx.auditLog.create({data:{companyId:auth.companyId,actorId:auth.id,action:data.action,entityId:data.action==='CLIENT_DEPOSIT'?data.clientId:auth.companyId}})
    })
    return jsonResponse({success:true})
  }catch(e){return apiError(e)}
}
