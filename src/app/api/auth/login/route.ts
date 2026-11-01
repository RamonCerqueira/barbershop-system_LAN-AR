import { jsonResponse } from '@/lib/json'
import { z } from 'zod'
import { emailInput } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/http'
import { sessionCookieOptions } from '@/lib/security'
import { NextRequest } from 'next/server'
import { authenticateUser, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = z.object({ email: emailInput, password: z.string().min(1).max(72) }).parse(await request.json())
    await rateLimit(request, 'login', email)

    if (!email || !password) {
      return jsonResponse(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const user = await authenticateUser(email, password)

    if (!user) {
      return jsonResponse(
        { error: 'Credenciais inválidas ou conta inativa' },
        { status: 401 }
      )
    }

    const token = await generateToken(user)

    const response = jsonResponse({
      user
    })

    response.cookies.set('barberpro_token', token, sessionCookieOptions())

    return response
  } catch (error) { return apiError(error) }
}
