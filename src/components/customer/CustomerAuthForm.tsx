'use client'


import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useCustomer, customerRequest } from './CustomerPortal'

export function CustomerAuthForm({ mode }: { mode: 'login' | 'register' | 'recovery' }) {
  const { refresh } = useCustomer(), router = useRouter()
  const [next, setNext] = useState('/cliente')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', acceptTerms: false, token: '' })
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  useEffect(() => { const query = new URLSearchParams(window.location.search); if (query.get('password') === 'updated') setMessage('Senha alterada. Entre novamente na sua conta.'); const value = query.get('next'); if (value && /^\/(cliente(?:\/|$)|confirm\/)/.test(value) && !value.includes('\\')) setNext(value) }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return
    setError(''); setMessage('')
    if ((mode === 'register' || mode === 'recovery' && step === 1) && form.password !== form.confirm) { setError('As senhas não conferem.'); return }
    setBusy(true)
    try {
      if (mode === 'recovery') {
        const response = await customerRequest('/api/customer/recovery', { method: step ? 'PUT' : 'POST', body: JSON.stringify(step ? { token: form.token.trim(), password: form.password } : { email: form.email }) })
        setMessage(response.message); if (!step) setStep(1); else setStep(2)
      } else {
        await customerRequest('/api/customer/auth', { method: 'POST', body: JSON.stringify({ action: mode === 'register' ? 'REGISTER' : 'LOGIN', name: form.name, phone: form.phone, email: form.email, password: form.password, acceptTerms: form.acceptTerms }) })
        await refresh(); router.replace(next)
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível acessar.') }
    finally { setBusy(false) }
  }
  const change = (key: keyof typeof form, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }))
  return <div className="cp-auth"><aside className="cp-auth-story"><span className="cp-eyebrow">SEU ESTILO, SEM COMPLICAÇÃO</span><h1>Um bom corte.<br />Uma experiência<br /> <em>do seu jeito.</em></h1><p>Encontre sua barbearia, escolha seu horário e tenha seu histórico sempre com você.</p><div><ShieldCheck size={20} />Seus dados e agendamentos em uma conta só.</div></aside><section className="cp-auth-card"><span className="cp-section-icon">{mode === 'recovery' ? <KeyRound /> : <UserRound />}</span><h2>{mode === 'login' ? 'Bom ter você de volta' : mode === 'register' ? 'Crie sua conta' : 'Recupere seu acesso'}</h2><p>{mode === 'login' ? 'Entre para organizar seus próximos atendimentos.' : mode === 'register' ? 'É rápido. Seu próximo horário está a poucos passos.' : 'Receba um código no e-mail cadastrado.'}</p>
    {error && <p className="cp-error" role="alert">{error}</p>}{message && <p className="cp-success" role="status">{message}</p>}
    {step !== 2 ? <form onSubmit={submit} className="cp-form">{mode === 'register' && <><label>Seu nome<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={e => change('name', e.target.value)} /></label><label>Telefone com DDD<input required type="tel" autoComplete="tel" value={form.phone} onChange={e => change('phone', e.target.value)} /></label></>}
      {step === 0 && <label>E-mail<input required type="email" autoComplete="email" value={form.email} onChange={e => change('email', e.target.value)} /></label>}
      {mode === 'recovery' && step === 1 && <label>Código recebido por e-mail<input required value={form.token} autoComplete="one-time-code" onChange={e => change('token', e.target.value)} /></label>}
      {(mode !== 'recovery' || step === 1) && <label>{mode === 'login' ? 'Senha' : 'Crie uma senha'}<input required type="password" minLength={mode === 'login' ? 1 : 8} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={e => change('password', e.target.value)} />{mode !== 'login' && <small>Use 8+ caracteres, com letra, número e símbolo.</small>}</label>}
      {(mode === 'register' || mode === 'recovery' && step === 1) && <label>Confirme a senha<input required type="password" autoComplete="new-password" value={form.confirm} onChange={e => change('confirm', e.target.value)} /></label>}
      {mode === 'register' && <label className="cp-check"><input required type="checkbox" checked={form.acceptTerms} onChange={e => change('acceptTerms', e.target.checked)} /><span>Concordo com o uso dos meus dados para criar minha conta, realizar reservas e permitir o contato da barbearia sobre meus atendimentos.</span></label>}
      <button type="submit" className="cp-button" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar na minha conta' : mode === 'register' ? 'Criar minha conta' : step ? 'Salvar nova senha' : 'Receber código'}{mode === 'recovery' ? <Mail size={17} /> : <ArrowRight size={17} />}</button>
    </form> : <Link href="/cliente/entrar" className="cp-button">Entrar na conta<ArrowRight size={17} /></Link>}
    <div className="cp-auth-links">{mode === 'login' ? <><Link href={`/cliente/cadastro?next=${encodeURIComponent(next)}`}>Não tem conta? Crie a sua</Link><Link href="/cliente/recuperar">Esqueci minha senha</Link></> : <Link href={`/cliente/entrar?next=${encodeURIComponent(next)}`}>Já tem conta? Entrar</Link>}{mode === 'recovery' && step === 0 && <button type="button" onClick={() => setStep(1)}>Já recebi um código</button>}</div>
  </section></div>
}
