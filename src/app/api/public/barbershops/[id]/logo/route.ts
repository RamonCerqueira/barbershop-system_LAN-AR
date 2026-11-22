import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicImage } from '@/lib/public-image'
import { apiError, HttpError } from '@/lib/http'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const company = await prisma.company.findFirst({ where: { id: (await params).id, isActive: true }, select: { logoPath: true } })
    if (!company?.logoPath) throw new HttpError(404, 'Imagem não encontrada.')
    return await publicImage(company.logoPath, 'company')
  } catch (error) { return apiError(error) }
}
