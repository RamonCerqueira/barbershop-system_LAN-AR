try { process.loadEnvFile('.env'); } catch { /* Environment injected by service. */ }
require('./register-ts.cjs');
const { prisma }=require('../src/lib/prisma.ts');
async function main(){
  const deadlines=await require('../src/lib/appointment-auto-cancel.ts').processAppointmentPaymentDeadlines();
  const waitlist=await require('../src/lib/waitlist.ts').processWaitlist();
  const reminders=await require('../src/lib/customer-reminders.ts').processCustomerReminders();
  console.log(JSON.stringify({event:'customer_operations_completed',deadlines,waitlist,reminders}));
}
main().catch(()=>{console.error('customer_operations_failed');process.exitCode=1}).finally(()=>prisma.$disconnect());
