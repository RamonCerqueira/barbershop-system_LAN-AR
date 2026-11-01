import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { apiError, HttpError } from '@/lib/http'
import { readProof } from '@/lib/proofs'
export async function GET(request: NextRequest,{params}:{params:Promise<{id:string}>}) {
  try{
    const auth=await getAuthUser(request)
    if(!auth?.companyId)throw new HttpError(401,'Não autorizado')
    const {id}=await params
    if(!await prisma.sale.findFirst({where:{companyId:auth.companyId,proofUrl:'/api/proofs/'+id}}))throw new HttpError(404,'Não encontrado.')
    const proof=await readProof(id)
    return new NextResponse(new Uint8Array(proof.buffer),{headers:{'Content-Type':proof.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}})
  }catch(error){return apiError(error)}
}
