import { rateLimit } from '@/lib/rate-limit'
import fs from 'node:fs/promises'
import { NextRequest } from 'next/server'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { logoFilePath, removeLogo, saveLogo } from '@/lib/company-logo'

async function authorize(request: NextRequest) {
  const customer = await requireCustomer(request)
  return prisma.customerAccount.findUniqueOrThrow({ where: { id: customer.id }, select: { id: true, avatarPath: true } })
}

export async function GET(request: NextRequest) {
  try {
    const user = await authorize(request)
    if (!user.avatarPath) throw new HttpError(404, 'Foto não encontrada.')
    const data = await fs.readFile(logoFilePath(user.avatarPath, 'customer'))
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': user.avatarPath.endsWith('.jpg') ? 'image/jpeg' : user.avatarPath.endsWith('.png') ? 'image/png' : 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  let filename: string | null = null
  try {
    const user = await authorize(request)
    await rateLimit(request, 'customer-avatar', user.id, 10, 3600)
    const form = await request.formData(), file = form.get('avatar')
    if (!(file instanceof File)) throw new HttpError(400, 'Selecione uma imagem PNG, JPG ou WEBP de até 2 MB.')
    filename = await saveLogo(file, 'customer')
    await prisma.customerAccount.update({ where: { id: user.id }, data: { avatarPath: filename } })
    await removeLogo(user.avatarPath, 'customer')
    return jsonResponse({ avatarUrl: `/api/customer/avatar?v=${filename}` })
  } catch (error) { if (filename) await removeLogo(filename, 'customer'); return apiError(error) }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authorize(request)
    await prisma.customerAccount.update({ where: { id: user.id }, data: { avatarPath: null } })
    await removeLogo(user.avatarPath, 'customer')
    return jsonResponse({ avatarUrl: null })
  } catch (error) { return apiError(error) }
}
