import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { runDailySubscriptionReminders } from '@/lib/subscription-reminders'
import { processAppointmentPaymentDeadlines } from '@/lib/appointment-auto-cancel'

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret =
      request.headers.get('x-cron-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    const authorizedBySecret = Boolean(cronSecret && headerSecret && headerSecret === cronSecret)

    if (!authorizedBySecret) {
      const auth = await getAuthUser(request)
      if (!auth || auth.type !== 'SYSTEM_OWNER') {
        return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
      }
    }

    const [summary, appointmentDeadlines] = await Promise.all([
      runDailySubscriptionReminders(),
      processAppointmentPaymentDeadlines()
    ])
    return jsonResponse({ success: true, ...summary, appointmentDeadlines })
  } catch (error) {
    return apiError(error)
  }
}
