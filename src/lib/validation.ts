import { z } from 'zod'

export const emailInput = z.string().trim().email().max(254).transform(v => v.toLowerCase())
export const passwordInput = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve incluir uma letra.')
  .regex(/[0-9]/, 'A senha deve incluir um número.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve incluir um caractere especial.')
export const phoneInput = z.string().transform(v => v.replace(/\D/g, '')).refine(v => /^\d{10,15}$/.test(v), 'Telefone inválido')
export const moneyInput = z.coerce.number().finite().min(0).max(1_000_000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Informe no máximo duas casas decimais')
export const timeInput = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T12:00:00Z`); return !Number.isNaN(+d) && d.toISOString().slice(0,10) === v }, 'Data inválida')
export function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false
  return [9, 10].every(size => { const sum = [...value.slice(0,size)].reduce((acc, digit, i) => acc + Number(digit) * (size + 1 - i), 0); return Number(value[size]) === (sum * 10 % 11) % 10 })
}
export const companyInput = z.object({
  name: z.string().trim().min(2).max(100), email: emailInput,
  cpf: z.string().transform(v => v.replace(/\D/g, '')).refine(validCpf, 'CPF inválido'),
  fullName: z.string().trim().min(2).max(100), birthDate: dateInput.refine(v => v < new Date().toISOString().slice(0,10), 'Nascimento inválido'),
  address: z.string().trim().min(5).max(500), phone: phoneInput,
  plan: z.enum(['MONTHLY','QUARTERLY','ANNUAL']), password: passwordInput,
  acceptTerms: z.boolean().refine(value => value, 'Você precisa aceitar os termos e a política de privacidade.')
})
export const bookingInput = z.object({
  companyId: z.string().min(1).optional(), serviceId: z.string().min(1), employeeId: z.string().min(1),
  clientId: z.string().min(1).optional(), clientName: z.string().trim().min(2).max(100).optional(), clientPhone: phoneInput.optional(),
  clientEmail: emailInput.optional(), date: dateInput, time: timeInput, notes: z.string().trim().max(1000).optional(),
  price: moneyInput.optional(), status: z.enum(['SCHEDULED','CONFIRMED']).optional()
})

export const serviceInput = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(2000).nullable().optional(), category: z.string().trim().min(1).max(50).optional(), price: moneyInput, duration: z.coerce.number().int().min(1).max(720), isActive: z.boolean().optional() })
export const productInput = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(2000).nullable().optional(), category: z.string().max(30).optional(), price: moneyInput, stock: z.coerce.number().int().min(0).max(1_000_000).optional(), minStock: z.coerce.number().int().min(0).max(1_000_000).optional(), isActive: z.boolean().optional() })
export const clientInput = z.object({ fullName: z.string().trim().min(2).max(100), phone: phoneInput, email: z.union([emailInput,z.literal('')]).nullable().optional(), address: z.string().max(500).nullable().optional(), birthDate: z.union([dateInput,z.literal('')]).nullable().optional(), notes: z.string().max(2000).nullable().optional(), rating: z.coerce.number().min(0).max(5).optional(), isActive: z.boolean().optional() })
export const employeeInput = z.object({ name: z.string().trim().min(2).max(100), phone: phoneInput, email: z.union([emailInput,z.literal('')]).nullable().optional(), role: z.enum(['BARBER','ADMIN','MARKETING','GENERAL_SERVICES','PODIATRY','MASSAGE','OTHER']).optional(), customRole: z.string().max(100).nullable().optional(), salary: moneyInput.optional(), commissionRate: z.coerce.number().min(0).max(100).optional(), hireDate: z.union([dateInput,z.literal('')]).optional(), isActive: z.boolean().optional(), specialties: z.array(z.union([z.string().trim().min(1).max(100),z.object({specialty:z.string().trim().min(1).max(100),level:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']).optional(),isActive:z.boolean().optional()})])).max(100).optional() })
