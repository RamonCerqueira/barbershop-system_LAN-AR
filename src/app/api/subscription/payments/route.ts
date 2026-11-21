import { isAvailablePlan } from '@/lib/plans'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { Plan } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { rateLimit } from '@/lib/rate-limit'
import { submitPixPayment } from '@/lib/subscription'

const MAX_PROOF_BYTES = 5 * 1024 * 1024

function resolveProofDir() {
  const base = process.env.UPLOAD_DIR && path.isAbsolute(process.env.UPLOAD_DIR)
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), 'storage', 'proofs')
  return path.join(base, 'subscription-proofs')
}

function detectFileSignature(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 4) return null
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' }
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  // PDF: %PDF
  if (buf.subarray(0, 4).toString('ascii') === '%PDF') {
    return { ext: 'pdf', mime: 'application/pdf' }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    await rateLimit(request, 'subscription-pix', auth.companyId, 10)

    const contentType = request.headers.get('content-type') || ''
    let planRaw = ''
    let payerNote = ''
    let proofFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      planRaw = String(form.get('plan') || '').toUpperCase()
      payerNote = String(form.get('payerNote') || '')
      const fileEntry = form.get('proof')
      if (fileEntry instanceof File && fileEntry.size > 0) {
        proofFile = fileEntry
      }
    } else {
      const body = await request.json()
      planRaw = String(body.plan || '').toUpperCase()
      payerNote = String(body.payerNote || '')
    }

    if (!isAvailablePlan(planRaw)) {
      throw new HttpError(400, 'Plano inválido. Escolha um plano mensal, semestral ou anual.')
    }

    if (payerNote.length > 500) {
      throw new HttpError(400, 'Observação muito longa (máximo 500 caracteres).')
    }

    let proofFilePath: string | null = null
    let proofFileName: string | null = null
    let proofMimeType: string | null = null

    if (proofFile) {
      if (proofFile.size > MAX_PROOF_BYTES) {
        throw new HttpError(400, 'O comprovante deve ter no máximo 5 MB.')
      }

      const buffer = Buffer.from(await proofFile.arrayBuffer())
      const detected = detectFileSignature(buffer)
      if (!detected) {
        throw new HttpError(
          400,
          'Formato de comprovante não suportado. Envie PNG, JPG, WEBP ou PDF válido.'
        )
      }

      const dir = resolveProofDir()
      await fs.mkdir(dir, { recursive: true })
      const safeFilename = `${auth.companyId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${detected.ext}`
      const fullPath = path.join(dir, safeFilename)
      await fs.writeFile(fullPath, buffer)

      proofFilePath = safeFilename
      proofFileName = path.basename(proofFile.name || safeFilename).slice(0, 120)
      proofMimeType = detected.mime
    }

    const payment = await submitPixPayment({
      companyId: auth.companyId,
      plan: planRaw as Plan,
      payerNote,
      proofFilePath,
      proofFileName,
      proofMimeType
    })

    return jsonResponse(
      {
        message: 'Pagamento PIX registrado com sucesso! Aguarde a verificação do administrador.',
        payment: {
          ...payment,
          amount: Number(payment.amount)
        }
      },
      { status: 201 }
    )
  } catch (error) {
    return apiError(error)
  }
}
