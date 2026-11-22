import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operations'
import { requireCustomer,getCustomer } from '@/lib/customer-auth'
import { getAuthUser } from '@/lib/auth'
import { saveLogo,removeLogo } from '@/lib/company-logo'
import { apiError,HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { rateLimit } from '@/lib/rate-limit'

async function accessible(request: NextRequest,id:string) {
  const admin=await getAuthUser(request)
  const customer=await getCustomer(request)
  const scopes=[]
  if(admin?.companyId && ['ADMIN','MANAGER'].includes(admin.role||''))scopes.push({companyId:admin.companyId})
  if(customer)scopes.push({customerAccountId:customer.id})
  if(!scopes.length)throw new HttpError(401,'Entre na sua conta.')
  const appointment=await prisma.appointment.findFirst({where:{id,OR:scopes}})
  if(!appointment)throw new HttpError(404,'Atendimento não encontrado.')
  return appointment
}
export async function GET(request:NextRequest) {
  try {
    const id=z.string().min(1).parse(request.nextUrl.searchParams.get('appointmentId'))
    await accessible(request,id)
    const photos=await prisma.appointmentPhoto.findMany({where:{appointmentId:id},orderBy:{createdAt:'asc'}})
    return jsonResponse(photos.map(p=>({id:p.id,url:'/api/cut-photos/'+p.id,publicationConsent:p.publicationConsent})))
  }catch(e){return apiError(e)}
}
export async function POST(request:NextRequest) {
  let filename:string|null=null
  try {
    const auth=await requireOperator(request)
    await rateLimit(request,'cut-upload',auth.companyId,40,3600)
    const form=await request.formData()
    const id=z.string().min(1).parse(form.get('appointmentId'))
    const file=form.get('photo')
    if(!(file instanceof File))throw new HttpError(400,'Selecione uma foto PNG, JPG ou WEBP de até 2 MB.')
    filename=await saveLogo(file,'cut')
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'cut:'+id}))::text`
      const appointment=await tx.appointment.findFirst({where:{id,companyId:auth.companyId,status:'COMPLETED'}})
      if(!appointment)throw new HttpError(404,'Selecione um atendimento concluído da sua barbearia.')
      if(await tx.appointmentPhoto.count({where:{appointmentId:id}})>=4)throw new HttpError(400,'Cada atendimento permite até quatro fotos.')
      await tx.appointmentPhoto.create({data:{appointmentId:id,filename:filename!}})
    })
    return jsonResponse({success:true},{status:201})
  }catch(e){if(filename)await removeLogo(filename,'cut');return apiError(e)}
}
export async function PATCH(request:NextRequest) {
  try {
    const customer=await requireCustomer(request)
    const data=z.object({id:z.string().min(1),publicationConsent:z.boolean()}).parse(await request.json())
    const updated=await prisma.appointmentPhoto.updateMany({where:{id:data.id,appointment:{customerAccountId:customer.id,status:'COMPLETED'}},data:{publicationConsent:data.publicationConsent,consentAt:data.publicationConsent?new Date():null}})
    if(!updated.count)throw new HttpError(404,'Foto não encontrada no seu histórico.')
    return jsonResponse({success:true})
  }catch(e){return apiError(e)}
}
export async function DELETE(request:NextRequest) {
  try {
    const {id}=z.object({id:z.string().min(1)}).parse(await request.json())
    const photo=await prisma.appointmentPhoto.findUnique({where:{id}})
    if(!photo)throw new HttpError(404,'Foto não encontrada.')
    await accessible(request,photo.appointmentId)
    await prisma.appointmentPhoto.delete({where:{id}})
    await removeLogo(photo.filename,'cut')
    return jsonResponse({success:true})
  }catch(e){return apiError(e)}
}
