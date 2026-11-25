'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck2, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/lib/api'
export type LegalConsent = {accepted:boolean;hash:string;version:string;plan:string}
type Document = {kind:string;hash:string;version:string;content:string;plan:string;amount:number}
export default function LegalAcceptance({plan,signup=false,onChange}: {plan:string;signup?:boolean;onChange:(value:LegalConsent)=>void}) {
  const [document,setDocument]=useState<Document|null>(null)
  const [accepted,setAccepted]=useState(false)
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)
  useEffect(()=>{
    let active=true;setDocument(null);setAccepted(false);setError('');onChange({accepted:false,hash:'',version:'',plan})
    const url=(signup?'/api/legal':'/api/contracts')+'?plan='+encodeURIComponent(plan)
    void (async()=>{try{const response=await (signup?fetch(url,{cache:'no-store'}):apiFetch(url));const body=await response.json();if(!response.ok)throw new Error(body.error);if(active)setDocument(body)}catch(e){if(active)setError(e instanceof Error?e.message:'Não foi possível carregar o documento.')}})()
    return()=>{active=false}
  },[plan,signup,retry,onChange])
  const valid=document?.plan===plan
  const title=document?.kind==='UPGRADE'?'Aditivo de upgrade':document?.kind==='DOWNGRADE'?'Aditivo de downgrade':document?.kind==='RENEWAL'?'Instrumento de renovação':'Contrato de assinatura'
  return <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
    <h3 className="flex items-center gap-2 font-semibold text-white"><FileCheck2 size={20} className="text-amber-300"/>{title}</h3>
    {error?<div role="alert"><p className="text-sm text-red-300">{error}</p><button type="button" className="mt-3 inline-flex items-center gap-2 text-sm text-amber-300" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={15}/>Carregar novamente</button></div>:!valid?<p role="status" className="text-sm text-slate-400">Carregando o documento atualizado…</p>:<>
      <p className="text-sm leading-relaxed text-slate-300">Confira os recursos, os limites, o total do ciclo e as regras de vigência. O aceite não autoriza campanhas ou publicação de fotos.</p>
      <details className="rounded-xl border border-white/10 bg-black/20"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-300">Ler {title.toLowerCase()} e política de privacidade • versão {document.version}</summary><pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words border-t border-white/10 p-4 font-sans text-sm leading-7 text-slate-300" tabIndex={0}>{document.content}</pre></details>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-200"><input type="checkbox" checked={accepted} required onChange={event=>{setAccepted(event.target.checked);onChange({accepted:event.target.checked,hash:document.hash,version:document.version,plan})}} className="mt-1 h-5 w-5 shrink-0 accent-amber-400"/><span>Li e aceito expressamente este {title.toLowerCase()}, suas condições comerciais e a política de privacidade. Declaro que posso representar a barbearia.</span></label>
      <p className="text-xs leading-relaxed text-slate-400">O aceite registra a conta, a data e esta versão do documento. Consulte posteriormente em <Link className="text-amber-300 underline" href="/dashboard/contratos">Contratos e aditivos</Link>. <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(document.content)}`} download="barberpro-documento-para-leitura.txt" className="text-amber-300 underline">Baixar para ler</a></p>
    </>}
  </section>
}
