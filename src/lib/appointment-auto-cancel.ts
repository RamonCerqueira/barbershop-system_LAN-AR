import { prisma } from './prisma'
import { bookingInstant } from './booking-rules'

export async function processAppointmentPaymentDeadlines(companyIdFilter?: string, now: Date = new Date()) {
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      ...(companyIdFilter ? { id: companyIdFilter } : {})
    },
    include: { settings: true }
  })

  let cancelledCount = 0
  let remindedCount = 0

  for (const company of companies) {
    const cfg = (company.settings?.appointmentConfig as Record<string, unknown>) || {}
    if (!cfg.requirePrepaymentToConfirm) continue

    const deadlineHours = Math.max(1, Number(cfg.paymentDeadlineHours ?? 2))

    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        companyId: company.id,
        status: 'SCHEDULED'
      },
      include: {
        client: { select: { fullName: true, phone: true } },
        service: { select: { name: true } }
      }
    })

    for (const apt of pendingAppointments) {
      const dateStr = apt.date.toISOString().slice(0, 10)
      const instant = bookingInstant(dateStr, apt.time)
      const hoursUntil = (instant.getTime() - now.getTime()) / 3_600_000

      if (hoursUntil <= deadlineHours) {
        const autoNote = apt.notes
          ? `${apt.notes}\n[Cancelado automaticamente por falta de confirmação de pagamento PIX até ${deadlineHours}h antes]`
          : `[Cancelado automaticamente por falta de confirmação de pagamento PIX até ${deadlineHours}h antes]`

        await prisma.$transaction(async (tx) => {
          const updated = await tx.appointment.updateMany({
            where: { id: apt.id, status: 'SCHEDULED' },
            data: { status: 'CANCELLED', notes: autoNote }
          })
          if (updated.count > 0) {
            await tx.notification.create({
              data: {
                companyId: company.id,
                type: 'APPOINTMENT',
                title: 'Vaga cancelada automaticamente (PIX não confirmado)',
                message: `O agendamento de ${apt.client.fullName} (${apt.service.name} em ${dateStr} às ${apt.time}) foi cancelado automaticamente porque o pagamento PIX não foi confirmado até ${deadlineHours}h antes.`
              }
            })
            cancelledCount++
          }
        })
      } else if (hoursUntil <= deadlineHours + 2) {
        const existingReminder = await prisma.notification.findFirst({
          where: {
            companyId: company.id,
            type: 'PAYMENT',
            message: { contains: apt.id }
          }
        })
        if (!existingReminder) {
          await prisma.notification.create({
            data: {
              companyId: company.id,
              type: 'PAYMENT',
              title: 'Aviso: pagamento PIX pendente próximo do prazo limite',
              message: `Agendamento #${apt.id} de ${apt.client.fullName} (${dateStr} às ${apt.time}) aguarda confirmação de pagamento PIX. Será cancelado automaticamente se não for confirmado até ${deadlineHours}h antes.`
            }
          })
          remindedCount++
        }
      }
    }
  }

  return { cancelledCount, remindedCount }
}
