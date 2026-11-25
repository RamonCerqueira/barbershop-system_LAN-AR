import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { digest } from '@/lib/security'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
export async function GET(request: NextRequest, {params}: {params:Promise<{id:string}>}) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.type!=='SYSTEM_OWNER' && (!auth.companyId || auth.role!=='ADMIN')) throw new HttpError(403,'Acesso restrito ao administrador.')
    const {id} = await params
    const document = await prisma.contractAcceptance.findFirst({where:{id,...(auth.type==='SYSTEM_OWNER'?{}:{companyId:auth.companyId!})}})
    if (!document) throw new HttpError(404,'Documento não encontrado.')
    if (digest(document.content)!==document.documentHash) throw new HttpError(409,'Não foi possível verificar a integridade do documento. Contate o atendimento.')
    if (request.nextUrl.searchParams.get('download')==='true') return new NextResponse(document.content,{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="barberpro-${document.kind.toLowerCase()}-${document.id}.txt"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
    return jsonResponse(document,{headers:{'Cache-Control':'private, no-store'}})
  } catch(e) { return apiError(e) }
}
