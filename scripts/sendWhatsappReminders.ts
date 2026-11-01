import { queueCampaign, processMessages } from '../src/lib/messages'
import { prisma } from '../src/lib/prisma'
try { process.loadEnvFile('.env') } catch { /* injected env */ }
async function main() {
  const campaigns=await prisma.whatsAppCampaign.findMany({where:{isActive:true,company:{isActive:true}}})
  for(const campaign of campaigns) await queueCampaign(campaign.id,campaign.companyId)
  const result=await processMessages()
  console.log(JSON.stringify({event:'message_worker_completed',...result}))
}
main().catch(()=>{console.error(JSON.stringify({event:'message_worker_failed'}));process.exitCode=1}).finally(()=>prisma.$disconnect())
