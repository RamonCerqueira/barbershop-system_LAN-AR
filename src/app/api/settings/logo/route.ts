import fs from 'node:fs/promises'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { logoFilePath, logoUrl, removeLogo, saveLogo } from '@/lib/company-logo'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'

export const runtime = 'nodejs'

async function authorize(request: NextRequest, write = false) {
  const auth = await getAuthUser(request)
  if (!auth?.companyId) throw new HttpError(401, 'Não autorizado')
  if (write) await requireCompanySubscriptionAccess(auth.companyId)
  const company = await prisma.company.findUnique({ where: { id: auth.companyId }, select: { id: true, logoPath: true } })
  if (!company) throw new HttpError(404, 'Empresa não encontrada')
  return company
}

export async function GET(request: NextRequest) {
  try {
    const company = await authorize(request)
    if (!company.logoPath) throw new HttpError(404, 'Logomarca não encontrada')
    const buffer = await fs.readFile(logoFilePath(company.logoPath))
    const extension = company.logoPath.split('.').pop()
    return new Response(new Uint8Array(buffer), { headers: {
      'Content-Type': extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  let filename: string | null = null
  try {
    const company = await authorize(request, true)
    if (Number(request.headers.get('content-length')) > 2 * 1024 * 1024 + 64 * 1024) throw new HttpError(413, 'A logomarca deve ter até 2 MB.')
    const form = await request.formData()
    const file = form.get('logo')
    if (!(file instanceof File)) throw new HttpError(400, 'Selecione a imagem da logomarca.')
    filename = await saveLogo(file)
    await prisma.company.update({ where: { id: company.id }, data: { logoPath: filename } })
    await removeLogo(company.logoPath)
    return jsonResponse({ logoUrl: logoUrl(filename), message: 'Logomarca enviada com sucesso!' })
  } catch (error) {
    if (filename) await removeLogo(filename)
    return apiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const company = await authorize(request, true)
    await prisma.company.update({ where: { id: company.id }, data: { logoPath: null } })
    await removeLogo(company.logoPath)
    return jsonResponse({ logoUrl: null, message: 'Logomarca removida.' })
  } catch (error) { return apiError(error) }
}
