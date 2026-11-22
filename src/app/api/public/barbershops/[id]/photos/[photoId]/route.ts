import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicImage } from '@/lib/public-image'
import { apiError, HttpError } from '@/lib/http'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const { id, photoId } = await params
    const photo = await prisma.companyPhoto.findFirst({ where: { id: photoId, companyId: id, company: { isActive: true } } })
    if (!photo) throw new HttpError(404, 'Imagem não encontrada.')
    return await publicImage(photo.filename, 'gallery')
  } catch (error) { return apiError(error) }
}
