'use client'
/* eslint-disable @next/next/no-img-element -- The provider supplies an ephemeral PNG data URL, never a persistent image. */
import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, QrCode, RefreshCw, Unplug } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type State = {state:string;used:number;limit:number;uncertain:number;uncertainMessages:{id:string;to:string;message:string;createdAt:string}[]}
export default function WhatsAppConnection() {
  const [data,setData] = useState<State | null>(null)
  const [error,setError] = useState('')
  const [qr,setQr] = useState<{src:string;expires:number}|null>(null)
  const [busy,setBusy] = useState(false)
  const load = useCallback(async()=>{
    try { const r=await apiFetch('/api/whatsapp');const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);setError('');if(b.state==='open')setQr(null) } catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar a conexão.')}
  },[])
  useEffect(()=>{void load();const timer=setInterval(()=>{void load();setQr(q=>q&&q.expires>Date.now()?q:null)},10000);return()=>clearInterval(timer)},[load])
  async function act(action:string,extra:Record<string,unknown>={}){setBusy(true);setError('');try{const r=await apiFetch('/api/whatsapp',{method:'POST',body:JSON.stringify({action,...extra})});const b=await r.json();if(!r.ok)throw new Error(b.error);setQr(b.qr?{src:b.qr,expires:new Date(b.expiresAt).getTime()}:null);await load()}catch(e){setError(e instanceof Error?e.message:'Tente novamente.')}finally{setBusy(false)}}
  const labels:Record<string,string>={open:'Conectado',close:'Desconectado',connecting:'Aguardando leitura do QR Code',absent:'Ainda não conectado',unavailable:'Serviço em preparação'}
  return <section className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-5">
    <h3 className="flex items-center gap-2 font-semibold"><MessageSquare size={20}/>WhatsApp da barbearia</h3>
    <p className="text-sm text-slate-300">Conecte um número pelo WhatsApp em Aparelhos conectados. Disponível no Profissional e Elite após o pagamento.</p>
    {error&&<p role="alert" className="text-sm text-amber-300">{error}</p>}
    {data&&<><p role="status" className="text-sm">{labels[data.state]||'Conectando…'}</p><p className="text-xs text-slate-400">{data.used.toLocaleString('pt-BR')} de {data.limit.toLocaleString('pt-BR')} envios utilizados ou reservados neste mês. Renovação da cota no dia 1º, horário de Brasília. Sem cobrança excedente.</p>{data.uncertain>0&&<p className="text-sm text-amber-300">{data.uncertain} envio(s) com resultado incerto. Confira no WhatsApp antes de enviar novamente; não fazemos repetição automática.</p>}<div className="flex flex-wrap gap-3"><button type="button" disabled={busy||data.state==='unavailable'} onClick={()=>void act('CONNECT')} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black disabled:opacity-40"><QrCode size={17}/>{busy?'Aguarde…':data.state==='open'?'Verificar conexão':'Gerar QR Code'}</button><button type="button" disabled={busy} onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm"><RefreshCw size={16}/>Atualizar</button>{data.state==='open'&&<button type="button" disabled={busy} onClick={()=>void act('DISCONNECT')} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300"><Unplug size={16}/>Desconectar</button>}</div></>}
    {data?.uncertainMessages?.map(job=><article key={job.id} className="rounded-xl border border-amber-400/20 p-4 text-sm"><p>Final {job.to.slice(-4)} • {new Date(job.createdAt).toLocaleString('pt-BR')}</p><p className="mt-2 text-slate-400">{job.message.slice(0,180)}</p><p className="mt-2 text-xs">Após conferir a conversa no WhatsApp:</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} className="rounded-lg border border-white/15 px-3 py-2" onClick={()=>void act('RESOLVE_UNCERTAIN',{id:job.id,sent:true})}>Confirmei o envio</button><button type="button" disabled={busy} className="rounded-lg border border-white/15 px-3 py-2" onClick={()=>void act('RESOLVE_UNCERTAIN',{id:job.id,sent:false})}>Não foi enviado</button></div></article>)}
    {qr&&qr.expires>Date.now()&&<div className="space-y-2"><img src={qr.src} alt="QR Code para conectar o WhatsApp desta barbearia" className="h-64 w-64 max-w-full rounded-xl bg-white p-3"/><p className="text-xs text-slate-400">QR Code temporário. Gere outro se expirar. Não compartilhe esta imagem.</p></div>}
    <p className="text-xs text-slate-400">Integração com Evolution API por WhatsApp Web. A conexão pode precisar de nova leitura do QR Code. Envios dependem do consentimento do cliente. Campanhas são exclusivas do Elite.</p>
  </section>
}
