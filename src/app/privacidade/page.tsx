import Link from 'next/link'
import { PRIVACY_TEXT, PRIVACY_VERSION } from '@/lib/legal-content'
export const metadata={title:'Política de privacidade | BarberPro'}
export default function PrivacyPage(){return <main className="min-h-screen bg-[#080808] px-5 py-12 text-white"><article className="mx-auto max-w-3xl"><Link href="/planos" className="text-orange-300">← Planos e recursos</Link><h1 className="mt-8 text-3xl font-bold">Política de privacidade</h1><p className="mt-3 text-sm text-zinc-400">Versão {PRIVACY_VERSION}</p><pre className="mt-8 whitespace-pre-wrap break-words font-sans text-base leading-8 text-zinc-300">{PRIVACY_TEXT}</pre><Link href="/contrato" className="mt-8 inline-block text-orange-300 underline">Contrato de assinatura</Link></article></main>}
