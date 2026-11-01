'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import {
  calculatePotentialRevenue,
  formatBRL,
  formatCompactBRL,
} from '@/lib/landing-utils';

export function RevenueCalculator() {
  const [ticketMedio, setTicketMedio] = useState(50);
  const [horariosPerdidos, setHorariosPerdidos] = useState(12);
  const [percentualRecuperacao, setPercentualRecuperacao] = useState(50);

  const { receitaMensal, projecaoAnual } = calculatePotentialRevenue(
    ticketMedio,
    horariosPerdidos,
    percentualRecuperacao
  );

  const ticketPercent = ((ticketMedio - 25) / (150 - 25)) * 100;
  const horariosPercent = ((horariosPerdidos - 2) / (60 - 2)) * 100;
  const recuperacaoPercent = ((percentualRecuperacao - 10) / (90 - 10)) * 100;

  return (
    <section
      id="simulador-receita"
      aria-label="Calculadora interativa de recuperação de receita"
      className="py-16 lg:py-20 bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#111111] via-[#171717] to-[#111111] border border-[#FF7900]/30 p-6 sm:p-8 lg:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Coluna Esquerda: Título e Descrição */}
            <div className="lg:col-span-4 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-[#FF7900]/15 border border-[#FF7900]/35 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#FF9D00]">
                <DollarSign className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>SIMULADOR DE RECEITA</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-white">
                Quanto você pode
                <br />
                estar <span className="text-[#FF7900]">deixando de faturar?</span>
              </h2>

              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                Veja o potencial de recuperação de receita com a redução de faltas e horários
                vazios.
              </p>
            </div>

            {/* Coluna Central: 3 Sliders Interativos */}
            <div className="lg:col-span-5 space-y-5">
              {/* Slider 1: Ticket médio por atendimento */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label htmlFor="slider-ticket" className="text-zinc-200 font-semibold">
                    Ticket médio por atendimento
                  </label>
                  <span className="bg-[#080808] border border-white/15 px-3 py-1 rounded-lg font-bold text-white">
                    {formatCompactBRL(ticketMedio)}
                  </span>
                </div>
                <input
                  id="slider-ticket"
                  type="range"
                  min={25}
                  max={150}
                  step={5}
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #FF7900 ${ticketPercent}%, #27272a ${ticketPercent}%)`,
                  }}
                  className="barber-slider w-full"
                />
              </div>

              {/* Slider 2: Horários perdidos por mês */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label htmlFor="slider-horarios" className="text-zinc-200 font-semibold">
                    Horários perdidos por mês
                  </label>
                  <span className="bg-[#080808] border border-white/15 px-3.5 py-1 rounded-lg font-bold text-white">
                    {horariosPerdidos}
                  </span>
                </div>
                <input
                  id="slider-horarios"
                  type="range"
                  min={2}
                  max={60}
                  step={1}
                  value={horariosPerdidos}
                  onChange={(e) => setHorariosPerdidos(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #FF7900 ${horariosPercent}%, #27272a ${horariosPercent}%)`,
                  }}
                  className="barber-slider w-full"
                />
              </div>

              {/* Slider 3: Percentual de recuperação */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label htmlFor="slider-recuperacao" className="text-zinc-200 font-semibold">
                    Percentual de recuperação
                  </label>
                  <span className="bg-[#080808] border border-white/15 px-3 py-1 rounded-lg font-bold text-white">
                    {percentualRecuperacao}%
                  </span>
                </div>
                <input
                  id="slider-recuperacao"
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={percentualRecuperacao}
                  onChange={(e) => setPercentualRecuperacao(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #FF7900 ${recuperacaoPercent}%, #27272a ${recuperacaoPercent}%)`,
                  }}
                  className="barber-slider w-full"
                />
              </div>
            </div>

            {/* Coluna Direita: Card de Resultados Calculados Instantaneamente */}
            <div className="lg:col-span-3 bg-[#080808]/95 border border-[#FF7900]/40 rounded-2xl p-6 space-y-3 shadow-[0_0_35px_rgba(255,121,0,0.12)]">
              <p className="text-xs font-semibold text-[#FF9D00]">Receita potencial por mês</p>
              <p
                className="text-3xl sm:text-4xl font-extrabold text-[#00C853] tracking-tight"
                aria-live="polite"
              >
                {formatBRL(receitaMensal)}
              </p>

              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-[#A1A1AA]">Projeção em 12 meses</p>
                <p className="text-lg font-extrabold text-white mt-0.5" aria-live="polite">
                  {formatBRL(projecaoAnual)}
                </p>
              </div>

              <p className="text-[10px] text-zinc-400 leading-snug pt-1">
                Simulação ilustrativa. Não representa garantia de resultados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

