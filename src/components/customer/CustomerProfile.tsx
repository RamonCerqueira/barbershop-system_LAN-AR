'use client'

/* eslint-disable @next/next/no-img-element -- Customer uploads and private session images preserve original URLs. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Camera, Check, Heart, History, KeyRound, LogOut, Scissors, UserRound } from 'lucide-react'
import { CustomerAccess, customerRequest, useCustomer } from './CustomerPortal'

export default function CustomerProfile() {
  const { customer, loading, favorites, refresh } = useCustomer(), router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '', confirm: '' }), [completed, setCompleted] = useState(0)
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  useEffect(() => { if (customer) { setForm(previous => ({ ...previous, name: customer.name, phone: customer.phone })); void customerRequest('/api/customer/appointments').then(items => setCompleted(items.filter((item: { status: string }) => item.status === 'COMPLETED').length)).catch(() => undefined) } }, [customer])
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return
    setError(''); setMessage('')
    if (form.newPassword !== form.confirm) { setError('A confirmação da senha não confere.'); return }
    setBusy(true)
    try {
      const response = await customerRequest('/api/customer/profile', { method: 'PATCH', body: JSON.stringify({ name: form.name, phone: form.phone, ...(form.newPassword ? { currentPassword: form.currentPassword, newPassword: form.newPassword } : {}) }) })
      await refresh()
      if (response.signInAgain) router.push('/cliente/entrar?password=updated')
      else setMessage('Pronto! Seus dados foram atualizados.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tente novamente.') }
    finally { setBusy(false) }
  }
  async function upload(file: File) {
    if (uploading) return
    if (file.size > 2097152 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Envie uma foto PNG, JPG ou WEBP de até 2 MB.'); return }
    setUploading(true); setError('')
    try { const data = new FormData(); data.append('avatar', file); await customerRequest('/api/customer/avatar', { method: 'POST', body: data }); await refresh(); setMessage('Sua foto foi atualizada.') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Tente novamente.') }
    finally { setUploading(false) }
  }
  if (!loading && !customer) return <CustomerAccess />
  if (!customer) return <div className="cp-skeleton" />
  return <><div className="cp-page-heading"><span className="cp-eyebrow">ESSE ESPAÇO É SEU</span><h1>Seu perfil. Seu estilo.</h1><p>Seus dados, suas preferências e cada experiência em um só lugar.</p></div>{error && <p className="cp-error" role="alert">{error}</p>}{message && <p className="cp-success" role="status">{message}</p>}<div className="cp-profile-layout"><aside><section className="cp-panel cp-profile-summary"><div className="cp-profile-avatar">{customer.avatarUrl ? <img src={customer.avatarUrl} alt="Sua foto de perfil" /> : <UserRound size={43} />}</div><h2>{customer.name}</h2><p>{customer.email}</p><label className="cp-secondary"><Camera size={15} />{uploading ? 'Enviando…' : 'Alterar foto'}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = '' }} /></label>{customer.avatarUrl && <button type="button" className="cp-text-button" onClick={async () => { try { await customerRequest('/api/customer/avatar', { method: 'DELETE' }); await refresh() } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tente novamente.') } }}>Remover foto</button>}<div className="cp-profile-stats"><Link href="/cliente/historico"><Scissors size={19} /><strong>{completed}</strong><span>Atendimentos</span></Link><Link href="/cliente/favoritos"><Heart size={19} /><strong>{favorites.length}</strong><span>Favoritos</span></Link></div><Link className="cp-secondary" href="/cliente/historico"><History size={16} />Ver meu histórico</Link><button type="button" className="cp-logout" onClick={async () => { try { await customerRequest('/api/customer/auth', { method: 'DELETE' }); await refresh(); router.push('/cliente') } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível sair. Tente novamente.') } }}><LogOut size={16} />Sair da conta</button></section></aside><form className="cp-form" onSubmit={save}><section className="cp-panel"><h2><UserRound size={20} />Seus dados</h2><div className="cp-form cp-two-columns"><label>Nome completo<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Telefone com DDD<input required type="tel" autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>E-mail de acesso<input type="email" value={customer.email} readOnly /><small>Usado para entrar na sua conta e recuperar sua senha.</small></label></div></section><section className="cp-panel"><h2><KeyRound size={20} />Segurança da conta</h2><p className="cp-note">Preencha somente se quiser alterar sua senha. Você precisará entrar novamente após a alteração.</p><div className="cp-form"><label>Senha atual<input type="password" autoComplete="current-password" maxLength={72} required={Boolean(form.newPassword)} value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} /></label><div className="cp-two-columns"><label>Nova senha<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} /><small>8+ caracteres, com letra, número e símbolo.</small></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" required={Boolean(form.newPassword)} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} /></label></div></div></section><button className="cp-button cp-save-profile" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar meus dados'}<Check size={17} /></button></form></div></>
}
