import fs from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function resolveProofDir() {
  const base = process.env.UPLOAD_DIR && path.isAbsolute(process.env.UPLOAD_DIR)
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), 'storage', 'proofs')
  return path.join(base, 'subscription-proofs')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id } })
  if (!payment || !payment.proofFilePath) {
    return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 })
  }

  if (auth.type !== 'SYSTEM_OWNER' && auth.companyId !== payment.companyId) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const safeName = path.basename(payment.proofFilePath)
  const fullPath = path.join(resolveProofDir(), safeName)

  try {
    const fileBuffer = await fs.readFile(fullPath)
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': payment.proofMimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${payment.proofFileName || safeName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'private, no-store'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo do comprovante indisponível' }, { status: 404 })
  }
}
