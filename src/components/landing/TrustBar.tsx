'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, RefreshCw, Award, Star } from 'lucide-react';

interface PublicSystemStats {
  activeBarbershops: number;
  totalServicesListed: number;
  loaded: boolean;
}

export function TrustBar() {
  const [stats, setStats] = useState<PublicSystemStats>({
    activeBarbershops: 0,
    totalServicesListed: 0,
    loaded: false,
  });

  useEffect(() => {
    let mounted = true;
    fetch('/api/public/barbershops')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.barbershops)
            ? data.barbershops
            : null;
        if (!list) return;
        const barbershops = list as Array<{ services?: Array<unknown> }>;
        const servicesCount = barbershops.reduce(
          (acc, shop) => acc + (Array.isArray(shop.services) ? shop.services.length : 0),
          0
        );
        setStats({
          activeBarbershops: barbershops.length,
          totalServicesListed: servicesCount,
          loaded: true,
        });
      })
      .catch(() => {
        // Silencioso caso offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      aria-label="Indicadores e benefícios objetivos da plataforma BarbeariaPro"
      className="relative z-10 border-t border-b border-white/[0.08] bg-[#111111]/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Indicador 1: Barbearias usando nosso sistema */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/35 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,121,0,0.15)]">
              <Users className="w-5 h-5 text-[#FF7900]" />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] leading-tight">
                Barbearias usando
                <br />
                nosso sistema
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 tracking-tight">
                {stats.loaded && stats.activeBarbershops > 0
                  ? `${stats.activeBarbershops} ativa${stats.activeBarbershops > 1 ? 's' : ''} • Multi-unidade`
                  : 'Multi-unidade'}
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                Arquitetura pronta para 1 a +20 cadeiras
              </p>
            </div>
          </div>

          {/* Indicador 2: Agendamentos realizados */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/35 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,121,0,0.15)]">
              <Calendar className="w-5 h-5 text-[#FF7900]" />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] leading-tight">
                Agendamentos
                <br />
                online sem conflito
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 tracking-tight">
                24h / 7 dias
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                {stats.loaded && stats.totalServicesListed > 0
                  ? `${stats.totalServicesListed} serviços publicados no portal`
                  : 'Bloqueio automático de horários duplicados'}
              </p>
            </div>
          </div>

          {/* Indicador 3: Taxa de retorno e retenção */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/35 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,121,0,0.15)]">
              <RefreshCw className="w-5 h-5 text-[#FF7900]" />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] leading-tight">
                Retorno e retenção
                <br />
                de clientes
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 tracking-tight">
                100% Automático
              </p>
              <p className="text-[11px] text-[#A1A1AA]">
                Lembretes e campanhas de reativação via WhatsApp
              </p>
            </div>
          </div>

          {/* Indicador 4: Experiência e satisfação */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/35 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,121,0,0.15)]">
              <Award className="w-5 h-5 text-[#FF7900]" />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] leading-tight">
                Experiência do cliente e do barbeiro
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold text-white">5.0</span>
                <div className="flex items-center text-[#FFB000]" aria-label="Cinco estrelas de usabilidade">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-[#FFB000] text-[#FFB000]" />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Agendamento sem cadastro de senha para o cliente
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

