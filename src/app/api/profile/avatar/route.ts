import fs from 'node:fs/promises'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { logoFilePath, removeLogo, saveLogo } from '@/lib/company-logo'

async function authorize(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth?.companyId) throw new HttpError(401, 'Não autorizado.')
  return prisma.user.findUniqueOrThrow({ where: { id: auth.id }, select: { id: true, avatarPath: true } })
}

export async function GET(request: NextRequest) {
  try {
    const user = await authorize(request)
    if (!user.avatarPath) throw new HttpError(404, 'Foto não encontrada.')
    const data = await fs.readFile(logoFilePath(user.avatarPath, 'profile'))
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': user.avatarPath.endsWith('.jpg') ? 'image/jpeg' : user.avatarPath.endsWith('.png') ? 'image/png' : 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  let filename: string | null = null
  try {
    const user = await authorize(request)
    const form = await request.formData(), file = form.get('avatar')
    if (!(file instanceof File)) throw new HttpError(400, 'Selecione uma imagem PNG, JPG ou WEBP de até 2 MB.')
    filename = await saveLogo(file, 'profile')
    await prisma.user.update({ where: { id: user.id }, data: { avatarPath: filename } })
    await removeLogo(user.avatarPath, 'profile')
    return jsonResponse({ avatarUrl: `/api/profile/avatar?v=${filename}` })
  } catch (error) { if (filename) await removeLogo(filename, 'profile'); return apiError(error) }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authorize(request)
    await prisma.user.update({ where: { id: user.id }, data: { avatarPath: null } })
    await removeLogo(user.avatarPath, 'profile')
    return jsonResponse({ avatarUrl: null })
  } catch (error) { return apiError(error) }
}
