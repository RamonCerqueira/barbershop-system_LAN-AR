import nodemailer from 'nodemailer'
import { HttpError } from './http'

function createTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new HttpError(503, 'Recuperação por e-mail indisponível. Contate o administrador.')
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    requireTLS: process.env.SMTP_PORT !== '465',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 5000,
    socketTimeout: 8000,
    greetingTimeout: 5000
  })
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

export async function sendRecoveryMail(email: string, token: string) {
  const transport = createTransport()
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Recuperação de acesso BarberPro',
    text: `Use este código uma única vez, em até 15 minutos:\n\n${token}\n\nSe não solicitou a recuperação, ignore este e-mail.`
  })
}

export async function sendSubscriptionMail(email: string, subject: string, text: string) {
  if (!isMailConfigured()) return { sent: false as const, reason: 'SMTP não configurado' }
  const transport = createTransport()
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text
  })
  return { sent: true as const }
}
