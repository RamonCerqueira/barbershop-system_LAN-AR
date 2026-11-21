import type { Metadata } from 'next'
import WaitingRoomScreen from '@/components/WaitingRoomScreen'

export const metadata: Metadata = { title: 'Painel de atendimentos', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <WaitingRoomScreen token={(await params).token} />
}
