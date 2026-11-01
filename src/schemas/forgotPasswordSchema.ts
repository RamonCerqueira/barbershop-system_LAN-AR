
import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Digite seu email ou telefone'),
})
