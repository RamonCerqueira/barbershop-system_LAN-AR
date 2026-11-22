import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { getCustomer } from '@/lib/customer-auth'
import { apiError,HttpError } from '@/lib/http'
import { publicImage } from '@/lib/public-image'

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const photo=await prisma.appointmentPhoto.findUnique({where:{id:(await params).id},include:{appointment:{include:{company:{select:{isActive:true}}}}}})
    if(!photo)throw new HttpError(404,'Foto não encontrada.')
    const published=photo.publicationConsent && photo.appointment.status==='COMPLETED' && photo.appointment.company.isActive
    if(!published){
      const admin=await getAuthUser(request)
      const customer=await getCustomer(request)
      if(!(admin?.companyId===photo.appointment.companyId && ['ADMIN','MANAGER'].includes(admin.role||'')) && !(customer && customer.id===photo.appointment.customerAccountId))throw new HttpError(404,'Foto não encontrada.')
    }
    const response=await publicImage(photo.filename,'cut')
    response.headers.set('Cache-Control','private, no-store')
    return response
  }catch(e){return apiError(e)}
}
