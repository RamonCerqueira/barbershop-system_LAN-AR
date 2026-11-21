import { prisma } from './prisma'
import { HttpError } from './http'
import { brazilDateString, evaluateCompanySubscription } from './subscription'
import { dayRange } from './booking-rules'
import { digest } from './security'

export async function boardAppointments(companyId: string, now = new Date()) {
  return prisma.appointment.findMany({
    where: { companyId, date: dayRange(brazilDateString(now)), status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] } },
    select: { id: true, time: true, duration: true, status: true, employeeId: true,
      client: { select: { fullName: true } }, service: { select: { name: true } }, employee: { select: { name: true } } },
    orderBy: [{ time: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
  })
}

export async function publicBoardCompany(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, 'Painel indisponível.')
  const company = await prisma.company.findUnique({ where: { waitingRoomToken: token } })
  if (!company || !company.waitingRoomEnabled || !evaluateCompanySubscription(company).hasAccess) throw new HttpError(404, 'Painel indisponível.')
  return company
}

export function abbreviatedName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/)
  return `${first}${rest.length ? ` ${rest[rest.length - 1].charAt(0)}.` : ''}`
}

export async function publicBoard(token: string, now = new Date()) {
  const company = await publicBoardCompany(token)
  const appointments = await boardAppointments(company.id, now)
  const items = appointments.map(apt => ({
    key: digest(`${token}:${apt.id}`).slice(0, 16), name: abbreviatedName(apt.client.fullName),
    time: apt.time, status: apt.status, professional: apt.employee.name, service: apt.service.name
  }))
  const calledIndex = company.waitingRoomCalledAt && now.getTime() - company.waitingRoomCalledAt.getTime() < 180_000
    ? appointments.findIndex(apt => apt.id === company.waitingRoomCalledId) : -1
  return {
    companyName: company.name, logoUrl: company.logoPath ? `/api/painel/${token}/logo?v=${company.logoPath}` : null,
    date: brazilDateString(now), updatedAt: now.toISOString(),
    current: items.filter(apt => apt.status === 'IN_PROGRESS'),
    upcoming: items.filter(apt => apt.status !== 'IN_PROGRESS'),
    called: calledIndex >= 0 ? { ...items[calledIndex], calledAt: company.waitingRoomCalledAt!.toISOString() } : null
  }
}
