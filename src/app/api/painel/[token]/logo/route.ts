import fs from 'node:fs/promises'
import { NextRequest } from 'next/server'
import { apiError, HttpError } from '@/lib/http'
import { publicBoardCompany } from '@/lib/waiting-room'
import { logoFilePath } from '@/lib/company-logo'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const company = await publicBoardCompany((await params).token)
    if (!company.logoPath) throw new HttpError(404, 'Logomarca não encontrada.')
    const data = await fs.readFile(logoFilePath(company.logoPath))
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': company.logoPath.endsWith('.jpg') ? 'image/jpeg' : company.logoPath.endsWith('.webp') ? 'image/webp' : 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
  } catch (error) { return apiError(error) }
}
