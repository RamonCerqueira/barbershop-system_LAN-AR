'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PRICING_PLANS } from '@/data/landing-content';
import { trackConversionEvent } from '@/lib/landing-utils';

export function Pricing() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackedViewRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !trackedViewRef.current) {
            trackedViewRef.current = true;
            trackConversionEvent('pricing_viewed', { section: 'pricing' });
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="planos"
      ref={sectionRef}
      className="py-20 lg:py-24 border-b border-white/[0.08] bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Coluna Esquerda: Título da Seção de Planos */}
          <div className="lg:col-span-3 flex flex-col justify-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Planos para o
              <br />
              <span className="text-[#FF7900]">crescimento</span> da
              <br />
              sua barbearia.
            </h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Escolha o plano ideal e comece hoje mesmo. Sem taxa de adesão e com liberação
              imediata do painel.
            </p>
          </div>

          {/* 3 Cards de Planos Lado a Lado */}
          <div className="lg:col-span-9 grid md:grid-cols-3 gap-6 items-stretch">
            {PRICING_PLANS.map((plan) => {
              const isHighlighted = plan.highlighted;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all ${isHighlighted
                      ? 'bg-gradient-to-b from-[#171717] to-[#111111] border-2 border-[#FF7900] shadow-[0_0_45px_rgba(255,121,0,0.2)]'
                      : 'bg-[#171717]/90 border border-white/10 hover:border-white/25'
                    }`}
                >
                  {isHighlighted && plan.badgeText && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] text-black text-[11px] font-extrabold px-3.5 py-0.5 rounded-full shadow">
                      {plan.badgeText}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                      <p className="text-xs text-[#A1A1AA] mt-0.5">{plan.subtitle}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-zinc-300">R$</span>
                        <span className="text-4xl font-extrabold text-white tracking-tight">
                          {plan.referenceMonthlyPrice}
                        </span>
                        <span className="text-xs text-[#A1A1AA]">/mês</span>
                      </div>
                      <p className="text-[11px] text-[#FF9D00] font-medium mt-1">
                        Contraste no checkout: {plan.systemCycleLabel}
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-white/[0.08]">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#FF7900] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/contratar?plan=${plan.contractPlanKey}&tier=${plan.id}`}
                    onClick={() => {
                      trackConversionEvent('plan_selected', {
                        section: 'pricing',
                        planId: plan.id,
                        planName: plan.name,
                        value: plan.referenceMonthlyPrice,
                      });
                      trackConversionEvent('signup_started', {
                        section: 'pricing',
                        planId: plan.id,
                        planName: plan.name,
                      });
                    }}
                    className={`mt-6 block w-full text-center font-extrabold text-xs py-3.5 rounded-xl transition-all ${isHighlighted
                        ? 'bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black shadow-[0_8px_24px_rgba(255,121,0,0.35)]'
                        : 'border border-white/20 hover:border-[#FF7900]/60 bg-[#111111] hover:bg-white/[0.06] text-white font-semibold'
                      }`}
                  >
                    Começar agora
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

