import { runDailySubscriptionReminders } from '../src/lib/subscription-reminders'

async function main() {
  const result = await runDailySubscriptionReminders()
  console.log(JSON.stringify({ event: 'subscription_reminders_completed', ...result }))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro na rotina diária de assinaturas:', err)
    process.exit(1)
  })
