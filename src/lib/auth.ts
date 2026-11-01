import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { jwtSecret, SESSION_SECONDS } from './security'

export interface AuthUserPayload {
  id: string
  email: string
  name: string
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  companyId?: string
  companyName?: string
  sessionId?: string
  employeeId?: string
  type: 'SYSTEM_OWNER' | 'COMPANY_USER'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateToken(payload: AuthUserPayload): Promise<string> {
  const secret = jwtSecret()
  const session = await prisma.authSession.create({ data: { subjectId: payload.id, subjectType: payload.type, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } })
  return jwt.sign({ ...payload, sessionId: session.id }, secret, { algorithm: 'HS256', expiresIn: SESSION_SECONDS, issuer: 'barberpro', audience: 'barberpro-web' })
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'], issuer: 'barberpro', audience: 'barberpro-web' }) as AuthUserPayload
    if (!payload.sessionId || !payload.id || !['COMPANY_USER', 'SYSTEM_OWNER'].includes(payload.type)) return null
    return payload
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUserPayload | null> {
  const authHeader = request.headers.get('authorization')
  let token: string | undefined

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim()
  }

  if (!token) {
    token = request.cookies.get('barberpro_token')?.value
  }

  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return null
  }

  const session = await prisma.authSession.findUnique({ where: { id: decoded.sessionId! } })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.subjectId !== decoded.id || session.subjectType !== decoded.type) return null

  if (decoded.type === 'COMPANY_USER' && decoded.companyId) {
    const user = await prisma.user.findFirst({ where: { id: decoded.id, companyId: decoded.companyId, isActive: true, company: { isActive: true } }, include: { company: true } })
    if (!user) return null
    const pathname = new URL(request.url).pathname
    if (user.role === 'EMPLOYEE' && !['/api/auth/me', '/api/auth/logout'].includes(pathname)) return null
    if (user.role !== 'ADMIN' && /^\/api\/(settings|employees|users)(\/|$)/.test(pathname)) return null
    return { ...decoded, role: user.role, email: user.email, name: user.name, companyName: user.company.name }
  }

  if (decoded.type === 'SYSTEM_OWNER') {
    const owner = await prisma.systemOwner.findUnique({ where: { id: decoded.id } })
    return owner ? { ...decoded, email: owner.email, name: owner.name } : null
  }

  return null
}

export async function authenticateUser(email: string, password: string): Promise<AuthUserPayload | null> {
  // Primeiro, tenta autenticar como proprietário do sistema
  const systemOwner = await prisma.systemOwner.findUnique({
    where: { email }
  })

  if (systemOwner) {
    const isValid = await verifyPassword(password, systemOwner.password)
    if (isValid) {
      return {
        id: systemOwner.id,
        email: systemOwner.email,
        name: systemOwner.name,
        type: 'SYSTEM_OWNER'
      }
    }
  }

  // Se não for proprietário do sistema, tenta autenticar como usuário de empresa
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true }
  })

  if (user) {
    const isValid = await verifyPassword(password, user.password)
    if (isValid && user.isActive && user.company.isActive) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
        type: 'COMPANY_USER'
      }
    }
  }

  return null
}

export async function createCompany(data: {
  name: string
  email: string
  cpf: string
  fullName: string
  birthDate: string
  address: string
  phone: string
  plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  password: string
}) {
  const planPrices = {
    MONTHLY: 10.0,
    QUARTERLY: 30.0,
    ANNUAL: 120.0
  }

  const hashedPassword = await hashPassword(data.password)

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        fullName: data.fullName,
        birthDate: new Date(data.birthDate),
        address: data.address,
        phone: data.phone,
        plan: data.plan,
        planPrice: planPrices[data.plan]
      }
    })

    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.fullName,
        role: 'ADMIN',
        companyId: company.id
      }
    })

    await tx.companySettings.create({
      data: {
        companyId: company.id,
        businessHours: {
          monday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
          tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
          wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
          thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
          friday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breakStart: '12:00', breakEnd: '13:00' },
          saturday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
          sunday: { isOpen: false, openTime: '09:00', closeTime: '15:00', breakStart: '12:00', breakEnd: '13:00' }
        },
        appointmentConfig: {
          slotDuration: 30,
          advanceBookingDays: 30,
          cancellationDeadline: 2,
          autoConfirm: false,
          allowOnlinePayment: true,
          requireDeposit: false,
          depositPercentage: 20
        },
        whatsappConfig: {
          apiUrl: 'https://api.whatsapp.com',
          apiToken: '',
          phoneNumber: data.phone.replace(/\D/g, ''),
          autoSendConfirmation: true,
          autoSendReminder: true,
          reminderHours: 24
        },
        locationConfig: {
          latitude: -23.5505,
          longitude: -46.6333,
          googleMapsApiKey: '',
          showOnMap: true,
          deliveryRadius: 5
        },
        notificationConfig: {
          emailNotifications: true,
          smsNotifications: false,
          whatsappNotifications: true,
          pushNotifications: true,
          notifyNewAppointments: true,
          notifyCancellations: true,
          notifyPayments: true,
          notifyLowStock: true
        }
      }
    })

    await tx.notification.create({
      data: {
        title: 'Bem-vindo ao BarberPro!',
        message: `A barbearia ${company.name} foi cadastrada com sucesso. Configure seus serviços e colaboradores.`,
        type: 'SYSTEM',
        companyId: company.id,
        userId: user.id
      }
    })

    return { company, user }
  })
}
