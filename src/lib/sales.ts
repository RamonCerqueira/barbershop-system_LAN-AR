import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from './prisma'
import { moneyInput } from './validation'
import { HttpError } from './http'
import { saveProof, removeProof } from './proofs'

const itemInput = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(1000) })
const saleInput = z.object({
  type: z.enum(['SERVICE','PRODUCT']), description: z.string().trim().min(2).max(300),
  amount: moneyInput.optional(), paymentMethod: z.enum(['CASH','PIX','DEBIT_CARD','CREDIT_CARD']),
  appointmentId: z.string().min(1).optional(), clientId: z.string().min(1).optional(),
  items: z.array(itemInput).max(100).optional(), proofUrl: z.string().max(1_500_000).nullable().optional(),
  status: z.enum(['PENDING','COMPLETED']).optional()
})
export const saleInclude = { client: true, appointment: { include: { service: true, employee: true } }, saleItems: { include: { product: true } } } as const
const paid = (status: string) => ['COMPLETED','APPROVED'].includes(status)
const cents = (n: number | Prisma.Decimal) => new Prisma.Decimal(n).times(100).round().toNumber()
async function serial(tx: Prisma.TransactionClient, company: string, key: string) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${company}),hashtext(${key}))::text` }

export async function registerSale(input: unknown, companyId: string, actorId: string, idempotency: string | null) {
  const data = saleInput.parse(input)
  if (!idempotency || !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency)) throw new HttpError(400,'Chave de operação obrigatória.')
  if (data.proofUrl && !/^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(data.proofUrl)) throw new HttpError(400,'Comprovante inválido. Use uma imagem PNG ou JPEG.')
  let savedProof: string | undefined
  try { return await prisma.$transaction(async tx => {
    await serial(tx,companyId,'sale:' + idempotency)
    const existing = await tx.sale.findUnique({ where: { idempotencyKey: companyId + ':' + idempotency }, include: saleInclude })
    if (existing) return { sale: existing, repeated: true }
    let amount = data.amount || 0
    let clientId = data.clientId
    if (data.appointmentId) {
      if (data.type !== 'SERVICE') throw new HttpError(400,'Uma venda de produto não pode quitar um atendimento.')
      await serial(tx,companyId,'appointment:' + data.appointmentId)
      const appointment = await tx.appointment.findFirst({ where: { id: data.appointmentId, companyId, status: { notIn: ['CANCELLED','NO_SHOW'] } } })
      if (!appointment || (clientId && clientId !== appointment.clientId)) throw new HttpError(404,'Atendimento indisponível.')
      if (await tx.sale.findFirst({ where: { appointmentId: appointment.id, status: { in: ['PENDING','APPROVED','COMPLETED'] } } })) throw new HttpError(409,'Este atendimento já possui um pagamento registrado.')
      amount = Number(appointment.price)
      clientId = appointment.clientId
    }
    if (clientId && !await tx.client.findFirst({ where: { id: clientId, companyId, isActive: true } })) throw new HttpError(404,'Cliente indisponível.')
    const items: { productId: string; quantity: number; unitPrice: number; totalPrice: number }[] = []
    if (data.type === 'PRODUCT') {
      if (!data.items?.length) throw new HttpError(400,'Selecione os produtos.')
      let totalCents = 0
      for (const item of [...data.items].sort((a,b) => a.productId.localeCompare(b.productId))) {
        const product = await tx.product.findFirst({ where: { id: item.productId, companyId, isActive: true } })
        if (!product) throw new HttpError(404,'Produto indisponível.')
        const changed = await tx.product.updateMany({ where: { id: product.id, companyId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } })
        if (!changed.count) throw new HttpError(409,'Estoque insuficiente. Atualize os dados.')
        const total = cents(product.price) * item.quantity
        totalCents += total
        items.push({ productId: product.id, quantity: item.quantity, unitPrice: Number(product.price), totalPrice: total / 100 })
      }
      amount = totalCents / 100
    } else if (data.items?.length) throw new HttpError(400,'Itens de produto não são permitidos nesta operação.')
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new HttpError(400,'Valor inválido.')
    const status = data.paymentMethod === 'PIX' && data.proofUrl ? 'PENDING' : data.status || 'COMPLETED'
    if(data.proofUrl) savedProof = await saveProof(data.proofUrl)
    const sale = await tx.sale.create({ data: { companyId, clientId, appointmentId: data.appointmentId, type: data.type, description: data.description, amount: cents(amount) / 100, paymentMethod: data.paymentMethod, status, proofUrl: savedProof, idempotencyKey: companyId + ':' + idempotency, stockDebited: items.length > 0, saleItems: { create: items } }, include: saleInclude })
    for (const item of items) await tx.stockMovement.create({ data: { companyId, saleId: sale.id, productId: item.productId, quantity: -item.quantity, reason: status === 'PENDING' ? 'PAYMENT_RESERVATION' : 'SALE' } })
    if (clientId && paid(status)) await tx.client.update({ where: { id: clientId }, data: { totalSpent: { increment: sale.amount } } })
    await tx.auditLog.create({ data: { companyId, actorId, action: 'SALE_CREATED', entityId: sale.id } })
    return { sale, repeated: false }
  }, { timeout: 15_000 }) } catch(error) { if(savedProof)await removeProof(savedProof);throw error }
}

export async function transitionSale(id: string, companyId: string, actorId: string, input: unknown) {
  const data = z.object({ status: z.enum(['APPROVED','REJECTED','COMPLETED','REFUNDED']), reason: z.string().trim().min(5).max(500).optional() }).parse(input)
  return prisma.$transaction(async tx => {
    await serial(tx,companyId,'sale-record:' + id)
    const current = await tx.sale.findFirst({ where: { id, companyId }, include: saleInclude })
    if (!current) throw new HttpError(404,'Venda não encontrada.')
    if (current.status === data.status) return current
    if (data.status === 'REFUNDED' ? !paid(current.status) : current.status !== 'PENDING') throw new HttpError(409,'Alteração de pagamento não permitida.')
    if (data.status === 'REFUNDED' && !data.reason) throw new HttpError(400,'Informe o motivo do estorno.')
    const reversal = data.status === 'REFUNDED' || data.status === 'REJECTED'
    if (reversal && current.stockDebited) {
      for (const item of [...current.saleItems].sort((a,b) => a.productId.localeCompare(b.productId))) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
        await tx.stockMovement.create({ data: { companyId, saleId: id, productId: item.productId, quantity: item.quantity, reason: data.status } })
      }
    }
    if (current.clientId) {
      if (!paid(current.status) && paid(data.status)) await tx.client.update({ where: { id: current.clientId }, data: { totalSpent: { increment: current.amount } } })
      if (paid(current.status) && data.status === 'REFUNDED') await tx.client.update({ where: { id: current.clientId }, data: { totalSpent: { decrement: current.amount } } })
    }
    await tx.auditLog.create({ data: { companyId, actorId, action: 'PAYMENT_' + data.status, entityId: id } })
    return tx.sale.update({ where: { id }, data: { status: data.status, stockDebited: reversal ? false : current.stockDebited, refundedAt: data.status === 'REFUNDED' ? new Date() : null, refundReason: data.reason }, include: saleInclude })
  }, { timeout: 15_000 })
}
