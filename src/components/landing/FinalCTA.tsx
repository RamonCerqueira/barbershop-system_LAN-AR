'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { trackConversionEvent } from '@/lib/landing-utils';

export function FinalCTA() {
  return (
    <section
      aria-label="Chamada final para criar conta na BarbeariaPro"
      className="relative py-16 lg:py-20 overflow-hidden bg-[#080808]"
    >
      {/* Imagem de fundo de barbearia com escurecimento progressivo */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <img
          src="/hero-barber-banner.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-left opacity-35"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.92) 38%, #080808 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #080808 0%, transparent 25%, transparent 75%, #080808 100%)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Pronto para transformar
              <br />
              sua barbearia?
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA]">
              Crie sua conta, configure sua barbearia e comece a receber agendamentos.
            </p>
          </div>

          <div className="flex flex-col items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link
              href="/contratar"
              onClick={() =>
                trackConversionEvent('signup_started', {
                  section: 'final_cta',
                  ctaLabel: 'Criar minha barbearia agora',
                })
              }
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold px-8 py-4 rounded-xl text-base shadow-[0_10px_32px_rgba(255,121,0,0.45)] hover:shadow-[0_12px_38px_rgba(255,121,0,0.65)] transition-all hover:-translate-y-0.5"
            >
              <span>Criar minha barbearia agora</span>
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </Link>
            <span className="text-[11px] text-[#A1A1AA] text-center">
              Sem fidelidade. Cancele quando quiser.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

