'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BellRing, Clock3, Maximize2, Scissors, WifiOff, Volume2, VolumeX } from 'lucide-react'

type BoardItem = { key: string; name: string; time: string; professional: string; service: string; status: string }
type BoardData = { companyName: string; logoUrl: string | null; date: string; updatedAt: string; current: BoardItem[]; upcoming: BoardItem[]; called: (BoardItem & { calledAt: string }) | null }

export default function WaitingRoomScreen({ token }: { token: string }) {
  const [data, setData] = useState<BoardData | null>(null)
  const [offline, setOffline] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [now, setNow] = useState(new Date())
  const [page, setPage] = useState(0)
  const [sound, setSound] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const audio = useRef<AudioContext | null>(null)
  const lastCall = useRef<string | null>(null)
  const soundRef = useRef(false)

  const chime = useCallback(() => {
    const context = audio.current
    if (!context || context.state !== 'running') return
    for (const [delay, frequency] of [[0, 660], [.2, 880]]) {
      const oscillator = context.createOscillator(), gain = context.createGain()
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.frequency.value = frequency
      const start = context.currentTime + delay
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(.12, start + .02)
      gain.gain.exponentialRampToValueAtTime(.001, start + .45)
      oscillator.start(start); oscillator.stop(start + .5)
    }
  }, [])

  useEffect(() => {
    let cancelled = false, timer: ReturnType<typeof setTimeout>
    let lastSuccess = 0
    const controller = new AbortController()
    setData(null); setUnavailable(false); lastCall.current = null
    const load = async () => {
      try {
        const response = await fetch(`/api/painel/${token}`, { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
        if (cancelled) return
        if (response.status === 404 || response.status === 402) {
          setData(null); setUnavailable(true); setOffline(false)
        } else {
          if (!response.ok) throw new Error('Conexão indisponível')
          const board: BoardData = await response.json()
          if (cancelled) return
          lastSuccess = Date.now()
          setData(board); setOffline(false); setUnavailable(false)
          if (board.called && board.called.calledAt !== lastCall.current) {
            if (lastCall.current !== null && soundRef.current) chime()
            lastCall.current = board.called.calledAt
          } else if (lastCall.current === null) lastCall.current = ''
        }
      } catch {
        if (!cancelled) { setOffline(true); if (Date.now() - lastSuccess > 30000) setData(null) }
      } finally { if (!cancelled) timer = setTimeout(load, 5000) }
    }
    void load()
    return () => { cancelled = true; controller.abort(); clearTimeout(timer) }
  }, [token, chime])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    const pagination = setInterval(() => setPage(value => value + 1), 12000)
    return () => { clearInterval(timer); clearInterval(pagination); void audio.current?.close() }
  }, [])

  async function toggleSound() {
    try {
      if (!audio.current) audio.current = new AudioContext()
      await audio.current.resume()
      soundRef.current = !soundRef.current
      setSound(soundRef.current)
      if (soundRef.current) chime()
    } catch { setFullscreenError('Som não disponível neste dispositivo.') }
  }

  const pages = Math.max(1, Math.ceil((data?.upcoming.length || 0) / 6))
  const visible = data?.upcoming.slice((page % pages) * 6, ((page % pages) + 1) * 6) || []
  const currentCall = data?.called && now.getTime() - Date.parse(data.called.calledAt) < 180000 ? data.called : null

  return <main className="waiting-screen">
    <header className="waiting-header">
      <div className="waiting-brand">
        {data?.logoUrl ? <img src={data.logoUrl} alt="Logomarca da barbearia" className="waiting-logo" /> : <span className="waiting-brand-mark"><Scissors size={30} /></span> /* eslint-disable-line @next/next/no-img-element */}
        <div><span className="waiting-eyebrow">BEM-VINDO À SUA BARBEARIA</span><h1>{data?.companyName || 'Painel de atendimentos'}</h1></div>
      </div>
      <div className="waiting-clock"><strong>{now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</strong><span>{now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' })}</span></div>
    </header>

    {offline && <div className="waiting-connection" role="status"><WifiOff size={16} />Conexão interrompida. Tentando reconectar…</div>}
    {!data ? <section className="waiting-empty"><Scissors size={44} /><h2>{unavailable ? 'Painel indisponível' : offline ? 'Aguardando conexão' : 'Preparando o seu atendimento…'}</h2><p>{unavailable ? 'Solicite à recepção um link ativo para acompanhar os atendimentos.' : 'Os atendimentos aparecerão aqui automaticamente.'}</p></section> : <>
      {currentCall && <section key={currentCall.calledAt} className="waiting-call" aria-live="polite"><span className="waiting-call-icon"><BellRing size={34} /></span><div><span>CHEGOU A SUA VEZ</span><h2>{currentCall.name}</h2><p>Dirija-se ao profissional <strong>{currentCall.professional}</strong></p></div></section>}
      <div className="waiting-columns">
        <section className="waiting-current"><div className="waiting-section-title"><span className="waiting-live-dot" /><h2>Em atendimento</h2><span>{data.current.length}</span></div>
          {data.current.length ? data.current.map(item => <article className="waiting-current-card" key={item.key}><span className="waiting-professional"><Scissors size={18} />{item.professional}</span><h3>{item.name}</h3><p>{item.service}</p><span className="waiting-status">Atendimento em andamento</span></article>) : <div className="waiting-placeholder"><Scissors size={28} /><p>Estamos prontos para receber você.</p></div>}
        </section>
        <section className="waiting-next"><div className="waiting-section-title"><Clock3 size={20} /><h2>Próximos horários</h2><span>{data.upcoming.length}</span></div>
          {visible.length ? <ol>{visible.map((item, index) => <li className="waiting-next-card" key={item.key}><span className="waiting-order">{String((page % pages) * 6 + index + 1).padStart(2, '0')}</span><div><h3>{item.name}</h3><p>{item.service} <span>· {item.professional}</span></p></div><time>{item.time}</time></li>)}</ol> : <div className="waiting-placeholder"><Clock3 size={28} /><p>Nenhum próximo atendimento para hoje.</p></div>}
          {pages > 1 && <p className="waiting-pagination">Página {(page % pages) + 1} de {pages} · exibição automática</p>}
        </section>
      </div>
    </>}
    <footer className="waiting-footer"><p>Horários agendados podem sofrer ajustes. A recepção organiza as chamadas.</p><div><button type="button" onClick={() => void toggleSound()} aria-pressed={sound}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{sound ? 'Som ativado' : 'Ativar som'}</span></button><button type="button" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setFullscreenError('') } catch { setFullscreenError('Tela cheia não disponível neste dispositivo.') } }}><Maximize2 size={17} /><span>Tela cheia</span></button></div>{fullscreenError && <span role="status">{fullscreenError}</span>}</footer>
  </main>
}
