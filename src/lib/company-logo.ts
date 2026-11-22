import path from 'node:path'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { HttpError } from './http'

export const MAX_LOGO_BYTES = 2 * 1024 * 1024
type ImageArea = 'company' | 'profile' | 'gallery' | 'customer' | 'cut'
const storageRoot = process.env.UPLOAD_DIR && path.isAbsolute(process.env.UPLOAD_DIR)
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), 'storage')
const directory = (area: ImageArea) => path.join(storageRoot, { profile: 'profile-avatars', company: 'company-logos', gallery: 'company-gallery', customer: 'customer-avatars', cut: 'cut-photos' }[area])

export function logoFilePath(filename: string, area: ImageArea = 'company') {
  if (!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(filename)) throw new HttpError(404, 'Logomarca não encontrada.')
  return path.join(directory(area), filename)
}

export function detectLogoType(buffer: Buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg'
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  throw new HttpError(400, 'Envie uma imagem PNG, JPG ou WEBP válida.')
}

export async function saveLogo(file: File, area: ImageArea = 'company') {
  if (!file.size || file.size > MAX_LOGO_BYTES) throw new HttpError(400, 'A logomarca deve ter até 2 MB.')
  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = detectLogoType(buffer)
  const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`
  await fs.mkdir(directory(area), { recursive: true })
  await fs.writeFile(logoFilePath(filename, area), buffer, { flag: 'wx' })
  return filename
}

export async function removeLogo(filename: string | null, area: ImageArea = 'company') {
  if (filename) await fs.unlink(logoFilePath(filename, area)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') console.error('Não foi possível remover a logomarca anterior:', error.code)
  })
}

export function logoUrl(filename: string | null) {
  return filename ? `/api/settings/logo?v=${filename}` : null
}
