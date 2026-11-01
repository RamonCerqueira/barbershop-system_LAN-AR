'use client';

import { Calendar, MessageSquare } from 'lucide-react';

export function HeroWidgets() {
  const barHeights = [28, 42, 34, 58, 48, 76, 65, 96];

  return (
    <div
      className="relative w-full lg:h-[540px] select-none pt-6 lg:pt-0"
      aria-label="Indicadores demonstrativos de agendamentos e faturamento"
    >
      {/* Mobile/Tablet (< lg): grid 2x2 sem sobreposição | Desktop (lg+): posicionado nos 4 cantos externos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:block lg:w-full lg:h-full relative">
        {/* WIDGET 1 (Canto Superior Esquerdo da coluna direita — à esquerda do ombro do barbeiro): Próximo atendimento */}
        <div className="animate-float-slow lg:absolute lg:top-2 lg:left-2 xl:left-4 bg-[#111111]/85 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-[0_18px_45px_rgba(0,0,0,0.85)] w-full lg:w-[178px] z-20">
          <p className="text-[10px] text-[#A1A1AA] font-medium mb-1.5">Próximo atendimento</p>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Foto ilustrativa do cliente João Victor"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover border border-[#FF7900]/60 shrink-0"
            />
            <div className="leading-tight min-w-0">
              <p className="text-[11px] font-bold text-white truncate">João Victor</p>
              <p className="text-[10px] text-[#A1A1AA] truncate">Corte + Barba</p>
              <p className="text-[9px] text-zinc-400">Hoje às 10:00</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
            Confirmado
          </span>
        </div>

        {/* WIDGET 2 (Canto Superior Direito — na borda direita abaixo do neon, longe da mão do barbeiro): Novo agendamento */}
        <div className="animate-float-delayed lg:absolute lg:top-4 lg:right-0 bg-[#111111]/85 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-[0_18px_45px_rgba(0,0,0,0.85)] w-full lg:w-[172px] z-20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Calendar className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-[10px] font-semibold text-white leading-tight">
              Novo agendamento
              <br />
              pelo site
            </p>
          </div>
          <div className="pl-0.5 pt-1 border-t border-white/10 mt-1">
            <p className="text-[11px] font-bold text-white">Mateus Silva</p>
            <p className="text-[10px] text-[#A1A1AA]">Corte</p>
            <p className="text-[9px] text-zinc-400">Hoje às 14:30</p>
          </div>
        </div>

        {/* WIDGET 3 (Canto Inferior Esquerdo da coluna direita — sem invadir a coluna dos botões): Faturamento hoje */}
        <div className="animate-float-delayed lg:absolute lg:bottom-4 lg:left-2 xl:left-4 bg-[#111111]/88 backdrop-blur-md border border-[#FF7900]/30 rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] w-full lg:w-[182px] z-20">
          <p className="text-[10px] text-[#A1A1AA] font-medium">Faturamento hoje</p>
          <p className="text-lg font-extrabold text-white tracking-tight mt-0.5">R$ 1.250,00</p>
          <p className="text-[9px] text-[#00C853] font-semibold mt-0.5">+18% em relação a ontem</p>
          <div className="flex items-end gap-1 h-8 mt-2 pt-1" aria-hidden="true">
            {barHeights.map((height, idx) => (
              <div
                key={idx}
                style={{
                  height: `${height}%`,
                  animationDelay: `${idx * 70}ms`,
                }}
                className="animate-bar-grow flex-1 rounded-t-xs bg-gradient-to-t from-[#FF7900] to-[#FFB000] shadow-[0_0_8px_rgba(255,121,0,0.35)]"
              />
            ))}
          </div>
        </div>

        {/* WIDGET 4 (Canto Inferior Direito — sobre o canto direito da capa preta): WhatsApp */}
        <div className="animate-float-slow lg:absolute lg:bottom-4 lg:right-0 bg-[#111111]/88 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] w-full lg:w-[198px] z-20 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#00C853]/20 border border-[#00C853]/40 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-[#00C853]" />
          </div>
          <div className="leading-snug">
            <p className="text-[11px] font-bold text-white">
              Lembrete enviado
              <br />
              para 18 clientes
            </p>
            <p className="text-[9px] text-[#A1A1AA] mt-0.5">Confirmações automáticas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
