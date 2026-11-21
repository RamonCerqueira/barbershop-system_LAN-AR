'use client'

import { useEffect, useState } from 'react'
import { Camera, LockKeyhole, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { SaasAlert, SaasField, SaasPageHeader, SaasSectionCard, SaasSubmitButton, saasInputClass } from '@/components/ui/SaasUI'

type Profile = { name: string; email: string; companyName: string; role: string; avatarUrl: string | null }

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void apiFetch('/api/profile', { signal: controller.signal }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setProfile(body)
    }).catch(error => { if (!controller.signal.aborted) setFeedback({ type: 'error', text: error.message }) })
    return () => controller.abort()
  }, [])

  async function avatar(file: File | null) {
    if (uploading || !profile) return
    if (file && (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) { setFeedback({ type: 'error', text: 'Envie PNG, JPG ou WEBP de até 2 MB.' }); return }
    setUploading(true); setFeedback(null)
    try {
      const form = new FormData()
      if (file) form.append('avatar', file)
      const response = await apiFetch('/api/profile/avatar', { method: file ? 'POST' : 'DELETE', ...(file ? { body: form } : {}) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setProfile({ ...profile, avatarUrl: body.avatarUrl })
      window.dispatchEvent(new Event('profile-updated'))
      setFeedback({ type: 'success', text: file ? 'Foto atualizada!' : 'Foto removida.' })
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao atualizar foto.' }) }
    finally { setUploading(false) }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving || !profile) return
    if (newPassword !== confirmation) { setFeedback({ type: 'error', text: 'A confirmação de senha não confere.' }); return }
    setSaving(true); setFeedback(null)
    try {
      const response = await apiFetch('/api/profile', { method: 'PATCH', body: JSON.stringify({ name: profile.name, ...(newPassword ? { currentPassword, newPassword } : {}) }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setCurrentPassword(''); setNewPassword(''); setConfirmation('')
      window.dispatchEvent(new Event('profile-updated'))
      setFeedback({ type: 'success', text: body.message })
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao salvar perfil.' }) }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl space-y-6"><SaasPageHeader kicker="Sua conta" title="Meu perfil" subtitle="Personalize sua identificação e mantenha sua conta segura." />
    {feedback && <SaasAlert variant={feedback.type} message={feedback.text} />}
    {!profile ? <div className="h-64 animate-pulse rounded-2xl bg-white/5" /> : <>
      <SaasSectionCard><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="profile-photo">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Sua foto de perfil" /> : <UserRound size={36} /> /* eslint-disable-line @next/next/no-img-element */}</div><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold text-white">{profile.name}</h2><p className="mt-1 text-sm text-slate-400">{profile.companyName}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/5 px-2.5 py-1 text-xs text-amber-300"><ShieldCheck size={13} />{profile.role === 'ADMIN' ? 'Administrador' : 'Gestor autorizado'}</span></div><div className="space-y-2"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 ${uploading ? 'pointer-events-none opacity-50' : ''}`}><Camera size={15} />{uploading ? 'Atualizando…' : 'Alterar foto'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void avatar(file); event.target.value = '' }} /></label>{profile.avatarUrl && <button type="button" disabled={uploading} onClick={() => void avatar(null)} className="flex items-center gap-2 px-3 py-1 text-xs text-slate-400"><Trash2 size={13} />Remover foto</button>}<p className="text-[10px] text-slate-500">PNG, JPG ou WEBP · até 2 MB</p></div></div></SaasSectionCard>
      <form onSubmit={save} className="space-y-6"><SaasSectionCard title="Dados do perfil" icon={<UserRound size={20} />}><div className="grid gap-5 sm:grid-cols-2"><SaasField label="Nome completo" htmlFor="profile-name" required><input id="profile-name" className={saasInputClass} value={profile.name} required minLength={2} maxLength={100} autoComplete="name" onChange={event => setProfile({ ...profile, name: event.target.value })} /></SaasField><SaasField label="E-mail de acesso" htmlFor="profile-email" hint="A alteração do e-mail é feita nas configurações da barbearia pelo administrador."><input id="profile-email" className={saasInputClass} value={profile.email} readOnly /></SaasField></div></SaasSectionCard>
        <SaasSectionCard title="Segurança da conta" description="Preencha apenas se quiser alterar sua senha." icon={<LockKeyhole size={20} />}><div className="grid gap-5 sm:grid-cols-3"><SaasField label="Senha atual" htmlFor="profile-current"><input id="profile-current" type="password" autoComplete="current-password" className={saasInputClass} value={currentPassword} required={Boolean(newPassword)} onChange={event => setCurrentPassword(event.target.value)} /></SaasField><SaasField label="Nova senha" htmlFor="profile-password" hint="8+ caracteres, com letra, número e símbolo."><input id="profile-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} className={saasInputClass} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></SaasField><SaasField label="Confirmar nova senha" htmlFor="profile-confirm"><input id="profile-confirm" type="password" autoComplete="new-password" className={saasInputClass} value={confirmation} required={Boolean(newPassword)} onChange={event => setConfirmation(event.target.value)} /></SaasField></div></SaasSectionCard><div className="flex justify-end"><SaasSubmitButton loading={saving}><Save size={16} />Salvar perfil</SaasSubmitButton></div></form>
    </>}
  </div>
}
