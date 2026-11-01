'use client';

import Link from 'next/link';
import { ChevronRight, Play, CheckCircle } from 'lucide-react';
import { HeroWidgets } from './HeroWidgets';
import { trackConversionEvent } from '@/lib/landing-utils';

interface HeroProps {
  onOpenDemo: () => void;
}

export function Hero({ onOpenDemo }: HeroProps) {
  return (
    <section
      id="inicio"
      className="relative pt-20 overflow-hidden bg-[#080808]"
    >
      {/* Palco Unificado (max-w-[1440px]): mantém a foto do barbeiro e os 4 cards na mesma coordenada exata em qualquer resolução de monitor */}
      <div className="max-w-[1440px] mx-auto relative min-h-[660px] lg:min-h-[730px] flex items-center">
        {/* Fotografia Cinematográfica Integrada ao Fundo (Sem Card/Moldura no Barbeiro) */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="/hero-barber-banner.jpg"
            alt="Barbeiro profissional atendendo cliente em uma barbearia premium com iluminação quente âmbar"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-[72%_center] sm:object-[68%_center] lg:object-right"
          />
          {/* Gradiente esquerdo para leitura do texto mantendo o barbeiro nítido à direita */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #080808 0%, rgba(8,8,8,0.92) 28%, rgba(8,8,8,0.55) 46%, rgba(8,8,8,0.04) 64%, rgba(8,8,8,0.12) 94%, #080808 100%)',
            }}
          />
          {/* Fusão superior e inferior contínua com o fundo #080808 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(8,8,8,0.55) 0%, transparent 15%, transparent 82%, #080808 100%)',
            }}
          />
        </div>

        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10 py-10 lg:py-14">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Coluna Esquerda (6 colunas = 50% da largura, espaço amplo para os 2 botões sem risco de invasão) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Badge Superior */}
              <div className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[#FF9D00]">
                <span className="w-5 h-[2px] bg-[#FF7900]" />
                <span>SISTEMA COMPLETO PARA BARBEARIAS</span>
              </div>

              {/* Headline Principal */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.06] tracking-tight text-white">
                Sua barbearia
                <br />
                mais cheia,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7900] via-[#FF9D00] to-[#FFB000]">
                  organizada e lucrativa.
                </span>
              </h1>

              {/* Descrição */}
              <p className="text-base sm:text-[16px] text-[#A1A1AA] max-w-lg leading-relaxed font-normal">
                Agendamentos online, caixa PDV, controle financeiro, comissões, estoque, Curva ABC e
                automação WhatsApp. Tudo em um só sistema, simples e completo.
              </p>

              {/* Botões de Ação contidos com folga dentro da coluna esquerda */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  href="/contratar"
                  onClick={() => {
                    trackConversionEvent('hero_cta_click', {
                      section: 'hero',
                      ctaLabel: 'Criar minha barbearia agora',
                    });
                    trackConversionEvent('signup_started', {
                      section: 'hero',
                      ctaLabel: 'Criar minha barbearia agora',
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold px-6 py-3.5 xl:px-7 xl:py-4 rounded-xl text-sm xl:text-base shadow-[0_10px_32px_rgba(255,121,0,0.45)] hover:shadow-[0_12px_38px_rgba(255,121,0,0.65)] transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap"
                >
                  <span>Criar minha barbearia agora</span>
                  <ChevronRight className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.5]" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    trackConversionEvent('hero_cta_click', {
                      section: 'hero',
                      ctaLabel: 'Ver demonstração',
                    });
                    trackConversionEvent('demo_started', {
                      section: 'hero',
                    });
                    onOpenDemo();
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-[#111111]/85 hover:bg-[#171717] backdrop-blur-md border border-white/20 hover:border-[#FF7900]/50 text-white font-semibold px-5 py-3.5 xl:px-6 xl:py-4 rounded-xl text-sm xl:text-base transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900] whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-4 h-4 text-[#FF7900] fill-[#FF7900]" />
                  <span>Ver demonstração</span>
                </button>
              </div>

              {/* Selos Rápidos */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00C853] shrink-0" />
                  <span>Setup em 2 minutos</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00C853] shrink-0" />
                  <span>Link de agendamento incluso</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00C853] shrink-0" />
                  <span>Planos a partir de R$ 10/mês</span>
                </span>
              </div>
            </div>

            {/* Coluna Direita (6 colunas = 50% da largura): Barbeiro no centro e 4 cards ancorados nos 4 cantos internos */}
            <div className="lg:col-span-6">
              <HeroWidgets />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
