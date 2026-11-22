import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'
import { saveLogo, removeLogo } from '@/lib/company-logo'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { z } from 'zod'

async function companyId(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user?.companyId || user.role !== 'ADMIN') throw new HttpError(403, 'Acesso exclusivo do administrador.')
  await requireCompanySubscriptionAccess(user.companyId)
  return user.companyId
}
export async function GET(request: NextRequest) {
  try {
    const id = await companyId(request)
    const photos = await prisma.companyPhoto.findMany({ where: { companyId: id }, orderBy: { createdAt: 'asc' } })
    return jsonResponse(photos.map(photo => ({ id: photo.id, url: `/api/public/barbershops/${id}/photos/${photo.id}` })))
  } catch (error) { return apiError(error) }
}
export async function POST(request: NextRequest) {
  let filename: string | null = null
  try {
    const id = await companyId(request)
    const file = (await request.formData()).get('photo')
    if (!(file instanceof File)) throw new HttpError(400, 'Selecione uma foto.')
    filename = await saveLogo(file, 'gallery')
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`gallery:${id}`}))::text`
      if (await tx.companyPhoto.count({ where: { companyId: id } }) >= 8) throw new HttpError(400, 'A galeria permite até oito fotos. Remova uma antes de adicionar outra.')
      await tx.companyPhoto.create({ data: { companyId: id, filename: filename! } })
    })
    return jsonResponse({ success: true })
  } catch (error) { if (filename) await removeLogo(filename, 'gallery'); return apiError(error) }
}
export async function DELETE(request: NextRequest) {
  try {
    const company = await companyId(request)
    const { id } = z.object({ id: z.string().min(1) }).parse(await request.json())
    const photo = await prisma.companyPhoto.findFirst({ where: { id, companyId: company } })
    if (!photo) throw new HttpError(404, 'Foto não encontrada.')
    await prisma.companyPhoto.delete({ where: { id } })
    await removeLogo(photo.filename, 'gallery')
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
