import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAppointmentPaymentDeadlines } from '@/lib/appointment-auto-cancel'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const company = await prisma.company.findFirst({
      where: { id, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        },
        employees: {
          where: { isActive: true, role: { in: ['BARBER','PODIATRY','MASSAGE'] } },
          include: {
            specialties: true
          }
        },
        clients: {
          select: { rating: true }
        },
        settings: true
      }
    })

    if (!company) {
      return jsonResponse({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    await processAppointmentPaymentDeadlines(company.id).catch(() => undefined)

    // Buscar agendamentos ocupados para a data selecionada (se informada)
    let bookedSlots: { time: string; employeeId: string; duration: number }[] = []
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number)
      const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0)
      const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999)

      const [appointments, blocks] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            companyId: company.id,
            date: { gte: startOfDay, lte: endOfDay },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] }
          },
          select: { time: true, employeeId: true, duration: true }
        }),
        prisma.employeeBlock.findMany({
          where: {
            companyId: company.id,
            date: dateParam
          },
          select: { employeeId: true, startTime: true, endTime: true }
        })
      ])

      const blockSlots = blocks.map((b) => {
        const [sh, sm] = b.startTime.split(':').map(Number)
        const [eh, em] = b.endTime.split(':').map(Number)
        return {
          time: b.startTime,
          employeeId: b.employeeId,
          duration: Math.max(1, (eh * 60 + em) - (sh * 60 + sm))
        }
      })

      bookedSlots = [...appointments, ...blockSlots]
    }

    const bh = (company.settings?.businessHours as any) || {}
    const aptConfig = (company.settings?.appointmentConfig as any) || {}
    const slotDuration = Math.max(1, Math.min(240, Number(aptConfig.slotDuration) || 30))
    const requiredDuration = company.services.find(service => service.id === searchParams.get('serviceId'))?.duration || slotDuration

    const dayKeys = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ]

    let targetDayConfig = bh.monday || {
      isOpen: true,
      openTime: '09:00',
      closeTime: '19:00',
      breakStart: '12:00',
      breakEnd: '13:00'
    }

    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number)
      const selectedDayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay()
      const dayKey = dayKeys[selectedDayOfWeek]
      if (bh[dayKey]) {
        targetDayConfig = bh[dayKey]
      }
    }

    const toMinutes = (hhmm: string) => {
      const [hh, mm] = (hhmm || '00:00').split(':').map(Number)
      return (hh || 0) * 60 + (mm || 0)
    }

    const toHHMM = (mins: number) => {
      const hh = String(Math.floor(mins / 60)).padStart(2, '0')
      const mm = String(mins % 60).padStart(2, '0')
      return `${hh}:${mm}`
    }

    const allSlots: string[] = []
    if (targetDayConfig.isOpen !== false) {
      const openMins = toMinutes(targetDayConfig.openTime || '08:30')
      const closeMins = toMinutes(targetDayConfig.closeTime || '19:00')
      const breakStartMins = targetDayConfig.breakStart
        ? toMinutes(targetDayConfig.breakStart)
        : -1
      const breakEndMins = targetDayConfig.breakEnd
        ? toMinutes(targetDayConfig.breakEnd)
        : -1

      for (let t = openMins; t + requiredDuration <= closeMins; t += slotDuration) {
        if (
          breakStartMins >= 0 &&
          breakEndMins > breakStartMins &&
          t < breakEndMins &&
          t + requiredDuration > breakStartMins
        ) {
          continue
        }
        if (dateParam && new Date(dateParam + 'T' + toHHMM(t) + ':00-03:00') <= new Date()) continue
        allSlots.push(toHHMM(t))
      }
    }

    const ratings = company.clients
      .map((c) => c.rating)
      .filter((r): r is number => typeof r === 'number')
    const avgRating =
      ratings.length > 0
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 0

    const loc = (company.settings?.locationConfig as any) || {}

    return jsonResponse({
      id: company.id,
      name: company.name,
      address: company.address,
      city: loc.city || '',
      neighborhood: loc.neighborhood || '',
      reference: loc.reference || '',
      latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
      longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
      instagram: loc.instagram || '',
      phone: company.phone,
      email: company.email,
      description:
        loc.description ||
        'Barbearia moderna com profissionais especializados e atendimento de excelência.',
      rating: avgRating,
      reviewCount: ratings.length,
      openingHours: {
        monday: bh.monday?.isOpen === false ? 'Fechado' : `${bh.monday?.openTime || '09:00'} - ${bh.monday?.closeTime || '19:00'}`,
        tuesday: bh.tuesday?.isOpen === false ? 'Fechado' : `${bh.tuesday?.openTime || '09:00'} - ${bh.tuesday?.closeTime || '19:00'}`,
        wednesday: bh.wednesday?.isOpen === false ? 'Fechado' : `${bh.wednesday?.openTime || '09:00'} - ${bh.wednesday?.closeTime || '19:00'}`,
        thursday: bh.thursday?.isOpen === false ? 'Fechado' : `${bh.thursday?.openTime || '09:00'} - ${bh.thursday?.closeTime || '20:00'}`,
        friday: bh.friday?.isOpen === false ? 'Fechado' : `${bh.friday?.openTime || '09:00'} - ${bh.friday?.closeTime || '20:00'}`,
        saturday: bh.saturday?.isOpen === false ? 'Fechado' : `${bh.saturday?.openTime || '08:00'} - ${bh.saturday?.closeTime || '18:00'}`,
        sunday: bh.sunday?.isOpen ? `${bh.sunday?.openTime || '09:00'} - ${bh.sunday?.closeTime || '14:00'}` : 'Fechado'
      },
      amenities: Array.isArray(loc.amenities) ? loc.amenities : [],
      acceptedPayments: Array.isArray(loc.acceptedPayments) ? loc.acceptedPayments : [],
      bookingPolicy: {
        cancellationDeadlineHours: Number(aptConfig.cancellationDeadline ?? 2),
        requirePrepaymentToConfirm: Boolean(aptConfig.requirePrepaymentToConfirm),
        paymentDeadlineHours: Number(aptConfig.paymentDeadlineHours ?? 2),
        pix: aptConfig.pixKey
          ? {
              key: String(aptConfig.pixKey),
              beneficiary: String(aptConfig.pixBeneficiary || company.fullName),
              bank: String(aptConfig.pixBank || '')
            }
          : null
      },
      services: company.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || 'Atendimento especializado',
        price: s.price,
        duration: s.duration,
        category: s.category || 'Cabelo'
      })),
      barbers: company.employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        specialties: e.specialties.map((sp) => sp.specialty),
        rating: null,
        experience: 'Especialista'
      })),
      availableTimes: allSlots,
      bookedSlots
    })
  } catch (error) {
    console.error('Erro ao buscar detalhes da barbearia:', error)
    return jsonResponse(
      { error: 'Erro ao buscar detalhes da barbearia' },
      { status: 500 }
    )
  }
}

