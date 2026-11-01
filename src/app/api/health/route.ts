import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/json'
export const dynamic='force-dynamic'
export async function GET() {
  try {
    await prisma.authSession.findFirst({select:{id:true}})
    return jsonResponse({status:'ok'},{headers:{'Cache-Control':'no-store'}})
  }catch{return jsonResponse({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
