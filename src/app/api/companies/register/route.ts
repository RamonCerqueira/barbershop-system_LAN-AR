import { jsonResponse } from '@/lib/json'
import { companyInput } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/http'
import { sessionCookieOptions } from '@/lib/security'
import { NextRequest } from 'next/server'
import { createCompany, generateToken, AuthUserPayload } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await rateLimit(request, 'signup', '', 5)
    const data = companyInput.parse(await request.json())

    const {
      name,
      email,
      cpf,
      fullName,
      birthDate,
      address,
      phone,
      plan,
      password,
      acceptTerms
    } = data

    if (!name || !email || !cpf || !fullName || !birthDate || !address || !phone || !plan || !password || !acceptTerms) {
      return jsonResponse(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    const cleanCpf = cpf.replace(/\D/g, '')
    if (!/^\d{11}$/.test(cleanCpf)) {
      return jsonResponse(
        { error: 'CPF inválido (deve conter 11 dígitos)' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return jsonResponse(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    if (!['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(plan)) {
      return jsonResponse(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    const result = await createCompany({
      name,
      email,
      cpf: cleanCpf,
      fullName,
      birthDate,
      address,
      phone,
      plan,
      password
    })

    const authUser: AuthUserPayload = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      companyId: result.company.id,
      companyName: result.company.name,
      type: 'COMPANY_USER'
    }

    const token = await generateToken(authUser)

    const response = jsonResponse(
      {
        message: 'Empresa registrada com sucesso!',
        companyId: result.company.id,
        user: authUser
      },
      { status: 201 }
    )

    response.cookies.set('barberpro_token', token, sessionCookieOptions())

    return response
  } catch (error) { return apiError(error) }
}
