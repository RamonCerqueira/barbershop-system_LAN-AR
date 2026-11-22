import fs from 'node:fs/promises'
import { logoFilePath } from './company-logo'

export async function publicImage(filename: string, area: 'company' | 'gallery') {
  const bytes = await fs.readFile(logoFilePath(filename, area))
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': filename.endsWith('.jpg') ? 'image/jpeg' : filename.endsWith('.webp') ? 'image/webp' : 'image/png', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=60' } })
}
