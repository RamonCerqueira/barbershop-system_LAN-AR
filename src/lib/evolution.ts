import { HttpError } from './http'
import { digest } from './security'
import { prisma } from './prisma'

export function isEvolutionConfigured() { return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_WEBHOOK_SECRET && process.env.APP_URL) }
export function evolutionInstance(companyId: string) { return 'bp_' + digest(companyId).slice(0,32) }
export async function evolutionRequest(path: string, method = 'GET', body?: unknown) {
  if (!isEvolutionConfigured()) throw new HttpError(503, 'Conexão WhatsApp ainda não configurada no servidor.')
  const base = new URL(process.env.EVOLUTION_API_URL!)
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback))) throw new HttpError(503, 'Endereço interno do WhatsApp inválido.')
  const response = await fetch(new URL(path, base), {method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:process.env.EVOLUTION_API_KEY!,'Content-Type':'application/json'},...(body ? {body:JSON.stringify(body)} : {})})
  if (!response.ok) throw new HttpError(response.status === 404 ? 404 : 503, response.status === 404 ? 'Conexão ainda não criada.' : 'WhatsApp temporariamente indisponível. Tente novamente.')
  return response.json()
}
export async function connectionState(instance: string) {
  try { const body = await evolutionRequest('/instance/connectionState/'+encodeURIComponent(instance)); return String(body.instance?.state || 'close') }
  catch (e) { if (e instanceof HttpError && e.status === 404) return 'absent'; throw e }
}
export function evolutionNumber(phone: string) { return /^\d{10,11}$/.test(phone) ? '55'+phone : phone }
export function quotaMonth(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(now)
}
export async function whatsappUsage(companyId: string) {
  return prisma.outboundMessage.count({where:{companyId,purpose:'TENANT',quotaMonth:quotaMonth(),OR:[{acceptedAt:{not:null}},{status:{in:['SENDING','UNKNOWN']}}]}})
}
export async function connectEvolution(companyId: string) {
  const instanceName = evolutionInstance(companyId)
  await prisma.whatsAppConnection.upsert({where:{companyId},create:{companyId,instanceName},update:{}})
  const state = await connectionState(instanceName)
  if (state === 'open') return {state}
  if (state === 'absent') {
    await evolutionRequest('/instance/create','POST',{instanceName,integration:'WHATSAPP-BAILEYS',qrcode:false,rejectCall:false,groupsIgnore:true,alwaysOnline:false,readMessages:false,readStatus:false,syncFullHistory:false,webhook:{enabled:true,url:new URL('/api/webhooks/evolution',process.env.APP_URL!).toString(),headers:{'x-evolution-secret':process.env.EVOLUTION_WEBHOOK_SECRET},events:['MESSAGES_UPDATE','SEND_MESSAGE'],byEvents:false,base64:false}})
  }
  const body = await evolutionRequest('/instance/connect/'+encodeURIComponent(instanceName))
  const qr = body.base64 || body.qrcode?.base64
  if (typeof qr !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr)) return {state:'connecting',qr:null,expiresAt:null}
  return {state:'connecting',qr,expiresAt:new Date(Date.now()+30000).toISOString()}
}
