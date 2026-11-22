'use client'
import Link from 'next/link'
import { useState } from 'react'
import { BellPlus } from 'lucide-react'
import { customerRequest,useCustomer } from './CustomerPortal'
export function WaitlistJoin({companyId,serviceId,employeeId,date,times}:{companyId:string;serviceId:string;employeeId:string;date:string;times:string[]}){
  const {customer}=useCustomer(),[time,setTime]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
  if(!employeeId||!serviceId||!times.length)return null
  return <details className="cp-waitlist"><summary><BellPlus size={17}/>Seu horário preferido está ocupado?</summary><div className="cp-form"><p className="cp-note">Entre na lista e acompanhe em Avisos. A vaga depende de disponibilidade e confirmação; você não será agendado automaticamente.</p><label>Horário desejado<select value={times.includes(time)?time:''} onChange={e=>{setTime(e.target.value);setMessage('');setError('')}}><option value="">Selecione um horário ocupado</option>{times.map(t=><option key={t}>{t}</option>)}</select></label>{customer?<button className="cp-secondary" disabled={busy||!times.includes(time)} onClick={async()=>{setBusy(true);setError('');try{await customerRequest('/api/customer/waitlist',{method:'POST',body:JSON.stringify({companyId,serviceId,employeeId,date,time})});setMessage('Você entrou na fila! Acompanhe na central de avisos.')}catch(e){setError(e instanceof Error?e.message:'Tente novamente.')}finally{setBusy(false)}}}>{busy?'Salvando…':'Entrar na lista de espera'}</button>:<Link className="cp-secondary" href="/cliente/entrar">Entre para participar</Link>}{message&&<p role="status" className="cp-success">{message} <Link href="/cliente/avisos">Ver minha lista</Link></p>}{error&&<p role="alert" className="cp-error">{error}</p>}</div></details>
}
