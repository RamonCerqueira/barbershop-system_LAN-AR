'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Scissors, ChevronRight } from 'lucide-react';
import { BOOKING_SERVICES_DEMO } from '@/data/landing-content';
import { trackConversionEvent } from '@/lib/landing-utils';

interface SystemShowcaseProps {
  onOpenDemo: () => void;
}

type DashboardModuleKey =
  | 'Dashboard'
  | 'Agendamentos'
  | 'Caixa PDV'
  | 'Comissões'
  | 'Estoque'
  | 'Curva ABC';

const MODULE_PREVIEWS: Record<
  DashboardModuleKey,
  {
    kpi1Label: string;
    kpi1Value: string;
    kpi2Label: string;
    kpi2Value: string;
    kpi3Label: string;
    kpi3Value: string;
    chartTitle: string;
    bars: number[];
    badge: string;
  }
> = {
  Dashboard: {
    kpi1Label: 'Faturamento',
    kpi1Value: 'R$ 18.450',
    kpi2Label: 'Atendimentos',
    kpi2Value: '342',
    kpi3Label: 'Ticket Médio',
    kpi3Value: 'R$ 54,00',
    chartTitle: 'Receita Semanal (PDV + Online)',
    bars: [35, 50, 42, 65, 58, 78, 62, 85, 74, 92, 88, 100],
    badge: 'Visão Geral Financeira',
  },
  Agendamentos: {
    kpi1Label: 'Hoje',
    kpi1Value: '24 horários',
    kpi2Label: 'Confirmados',
    kpi2Value: '22 (91%)',
    kpi3Label: 'Pendentes PIX',
    kpi3Value: '2',
    chartTitle: 'Ocupação de Cadeiras por Horário',
    bars: [45, 75, 90, 60, 40, 85, 95, 100, 90, 80, 70, 55],
    badge: 'Calendário Multi-Barbeiro',
  },
  'Caixa PDV': {
    kpi1Label: 'Saldo do Dia',
    kpi1Value: 'R$ 1.250',
    kpi2Label: 'PIX / Cartão',
    kpi2Value: 'R$ 980',
    kpi3Label: 'Dinheiro',
    kpi3Value: 'R$ 270',
    chartTitle: 'Fluxo de Entradas vs Saídas',
    bars: [30, 55, 65, 80, 72, 90, 85, 95, 78, 88, 92, 100],
    badge: 'Caixa Aberto • Sem divergências',
  },
  Comissões: {
    kpi1Label: 'Total Equipe',
    kpi1Value: 'R$ 7.380',
    kpi2Label: 'Rafael (50%)',
    kpi2Value: 'R$ 4.120',
    kpi3Label: 'Lucas (45%)',
    kpi3Value: 'R$ 3.260',
    chartTitle: 'Comissões Apuradas Automaticamente',
    bars: [50, 60, 58, 75, 70, 84, 80, 90, 86, 94, 91, 98],
    badge: 'Repasse por Serviço e Produto',
  },
  Estoque: {
    kpi1Label: 'Itens Ativos',
    kpi1Value: '48 produtos',
    kpi2Label: 'Giro Rápido',
    kpi2Value: 'Pomada Matte',
    kpi3Label: 'Alerta Mínimo',
    kpi3Value: '2 itens',
    chartTitle: 'Movimentação de Estoque e Vendas',
    bars: [60, 48, 72, 66, 80, 74, 88, 79, 92, 85, 90, 95],
    badge: 'Baixa Automática no PDV',
  },
  'Curva ABC': {
    kpi1Label: 'Classe A (80%)',
    kpi1Value: 'Corte + Barba',
    kpi2Label: 'Margem Líquida',
    kpi2Value: '78,4%',
    kpi3Label: 'Custo Insumos',
    kpi3Value: 'R$ 4,20/serv',
    chartTitle: 'Rentabilidade Real por Serviço (ABC)',
    bars: [100, 92, 84, 65, 52, 44, 36, 28, 22, 18, 14, 10],
    badge: 'Engenharia de Cardápio de Serviços',
  },
};

export function SystemShowcase({ onOpenDemo }: SystemShowcaseProps) {
  const [activeModule, setActiveModule] = useState<DashboardModuleKey>('Dashboard');
  const currentPreview = MODULE_PREVIEWS[activeModule];

  return (
    <section
      id="sistema-completo"
      className="relative py-20 lg:py-24 overflow-hidden border-b border-white/[0.08] bg-[#080808]"
    >
      {/* Fundo sutil de barbearia com escurecimento para profundidade */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none">
        <img
          src="/hero-barber-banner.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-left blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/85 to-[#080808]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Lado Esquerdo: Notebook exibindo o Dashboard + Smartphone exibindo o App */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-start pb-10 sm:pb-6">
            {/* Moldura do Notebook */}
            <div className="w-full max-w-[570px] bg-[#111111] rounded-2xl border-2 border-zinc-700/80 shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Barra Superior da Janela */}
              <div className="bg-[#171717] px-4 py-2.5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[11px] font-bold text-white flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-[#FF7900]" />
                    Barbearia<span className="text-[#FF7900]">Pro</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#FF9D00] bg-[#FF7900]/10 border border-[#FF7900]/30 px-2 py-0.5 rounded-full font-medium">
                  {currentPreview.badge}
                </span>
              </div>

              {/* Corpo Interno do Sistema no Notebook */}
              <div className="grid grid-cols-12 bg-[#080808] p-3.5 gap-3 min-h-[275px] sm:min-h-[300px]">
                {/* Menu Lateral Interativo do Notebook */}
                <div className="col-span-3 bg-[#111111] rounded-xl p-2 border border-white/[0.06] space-y-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    {(Object.keys(MODULE_PREVIEWS) as DashboardModuleKey[]).map((mod) => {
                      const isCurrent = activeModule === mod;
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => setActiveModule(mod)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#FF7900]/20 text-[#FF9D00] border border-[#FF7900]/40'
                              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {mod}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-zinc-500 px-1.5 pt-2 border-t border-white/5">
                    Clique nos módulos acima para inspecionar
                  </p>
                </div>

                {/* Área Principal do Dashboard no Notebook */}
                <div className="col-span-9 space-y-3">
                  {/* 3 Cards de KPIs */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#171717] p-2.5 rounded-xl border border-white/[0.07]">
                      <p className="text-[9px] text-[#A1A1AA]">{currentPreview.kpi1Label}</p>
                      <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
                        {currentPreview.kpi1Value}
                      </p>
                    </div>
                    <div className="bg-[#171717] p-2.5 rounded-xl border border-white/[0.07]">
                      <p className="text-[9px] text-[#A1A1AA]">{currentPreview.kpi2Label}</p>
                      <p className="text-xs sm:text-sm font-extrabold text-[#FF9D00] mt-0.5">
                        {currentPreview.kpi2Value}
                      </p>
                    </div>
                    <div className="bg-[#171717] p-2.5 rounded-xl border border-white/[0.07]">
                      <p className="text-[9px] text-[#A1A1AA]">{currentPreview.kpi3Label}</p>
                      <p className="text-xs sm:text-sm font-extrabold text-[#00C853] mt-0.5">
                        {currentPreview.kpi3Value}
                      </p>
                    </div>
                  </div>

                  {/* Gráfico + Calendário Lateral */}
                  <div className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-7 bg-[#171717] p-3 rounded-xl border border-white/[0.07]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-zinc-300">
                          {currentPreview.chartTitle}
                        </p>
                      </div>
                      <div className="flex items-end gap-1.5 h-28 pt-3">
                        {currentPreview.bars.map((val, idx) => (
                          <div
                            key={`${activeModule}-${idx}`}
                            style={{ height: `${val}%` }}
                            className="flex-1 rounded-t bg-gradient-to-t from-[#FF7900] to-[#FFB000] transition-all duration-300"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="col-span-5 bg-[#171717] p-3 rounded-xl border border-white/[0.07]">
                      <p className="text-[10px] font-semibold text-zinc-300 mb-2">Agenda do Mês</p>
                      <div className="grid grid-cols-7 gap-1 text-[8px] text-center text-zinc-400">
                        {[...Array(28)].map((_, idx) => (
                          <span
                            key={idx}
                            className={`py-1 rounded ${
                              idx === 9 || idx === 14 || idx === 21
                                ? 'bg-[#FF7900] text-black font-bold'
                                : 'bg-white/[0.04]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Base Metálica do Notebook */}
            <div className="hidden sm:block absolute bottom-3 left-0 w-full max-w-[590px] -ml-2.5 h-3.5 bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 rounded-b-xl shadow-2xl" />

            {/* Smartphone Sobreposto à Direita do Notebook */}
            <div className="hidden sm:block absolute -bottom-2 right-0 lg:right-2 w-[195px] bg-white text-zinc-900 rounded-[28px] border-[6px] border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-20">
              <div className="bg-[#111111] text-white px-3 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-[#FF7900]" />
                  Barbearia<span className="text-[#FF7900]">Pro</span>
                </span>
                <span className="w-6 h-1 rounded-full bg-zinc-700" />
              </div>
              <div className="p-3 space-y-2 bg-zinc-50">
                <p className="text-xs font-extrabold text-zinc-900">Escolha o serviço</p>
                {BOOKING_SERVICES_DEMO.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-xs"
                  >
                    <img
                      src={srv.avatar}
                      alt={srv.name}
                      loading="lazy"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="leading-tight min-w-0">
                      <p className="text-[10px] font-bold text-zinc-900 truncate">{srv.name}</p>
                      <p className="text-[9px] text-zinc-500">
                        R$ {srv.price},00 • {srv.duration}
                      </p>
                    </div>
                  </div>
                ))}
                <Link
                  href="/cliente"
                  className="block w-full text-center bg-gradient-to-r from-[#FF7900] to-[#FF9D00] text-black font-bold text-[10px] py-2 rounded-lg shadow mt-1"
                >
                  Agendar agora
                </Link>
              </div>
            </div>
          </div>

          {/* Lado Direito: Título, Descrição e CTAs */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Um sistema completo,
              <br />
              do <span className="text-[#FF7900]">agendamento ao caixa.</span>
            </h2>

            <p className="text-[#A1A1AA] text-base leading-relaxed">
              Gerencie sua barbearia de qualquer lugar. Controle agenda, atendimentos, financeiro,
              estoque, comissões e fidelize seus clientes com automações inteligentes.
            </p>

            {/* Seletor rápido de módulo para mobile/desktop */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(Object.keys(MODULE_PREVIEWS) as DashboardModuleKey[]).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setActiveModule(mod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    activeModule === mod
                      ? 'bg-[#FF7900]/15 border-[#FF7900] text-[#FF9D00]'
                      : 'bg-[#111111] border-white/10 text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/contratar"
                onClick={() =>
                  trackConversionEvent('signup_started', {
                    section: 'system_showcase',
                    ctaLabel: 'Testar agora gratuitamente',
                  })
                }
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-[0_10px_28px_rgba(255,121,0,0.35)] transition-all hover:-translate-y-0.5"
              >
                <span>Testar agora gratuitamente</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  trackConversionEvent('demo_started', {
                    section: 'system_showcase',
                    ctaLabel: 'Ver todas as funcionalidades',
                  });
                  onOpenDemo();
                }}
                className="text-sm font-semibold text-white hover:text-[#FF9D00] underline-offset-4 hover:underline px-2 py-2 transition-colors cursor-pointer"
              >
                Ver todas as funcionalidades
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

