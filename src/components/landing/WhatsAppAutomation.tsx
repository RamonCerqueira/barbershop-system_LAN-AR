'use client';

import { useState } from 'react';
import { Scissors, ChevronRight, MessageSquare, CheckCircle, ShieldCheck } from 'lucide-react';
import { WHATSAPP_TEMPLATES } from '@/data/landing-content';

export function WhatsAppAutomation() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [presenceConfirmed, setPresenceConfirmed] = useState(false);

  const currentTemplate = WHATSAPP_TEMPLATES[selectedIndex];

  const handleCycleTemplate = () => {
    setPresenceConfirmed(false);
    setSelectedIndex((prev) => (prev + 1) % WHATSAPP_TEMPLATES.length);
  };

  return (
    <section
      id="automacao-whatsapp"
      className="relative py-20 lg:py-24 overflow-hidden border-b border-white/[0.08] bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Coluna Esquerda: Smartphone com Conversa Demonstrativa e Card Flutuante */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-[265px] sm:w-[275px]">
              {/* Corpo do Smartphone levemente inclinado como na referência */}
              <div className="w-[235px] mx-auto bg-[#0b141a] rounded-[34px] border-[7px] border-zinc-800 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden -rotate-3">
                <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2.5 text-white">
                  <div className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5 text-[#FF7900]" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-bold">BarbeariaPro</p>
                    <p className="text-[9px] text-emerald-200">Conta comercial • Online</p>
                  </div>
                </div>
                <div className="h-[235px] bg-[#0b141a] p-3 flex flex-col justify-between">
                  <span className="self-center text-[9px] bg-zinc-800/80 text-zinc-300 px-2.5 py-0.5 rounded-full">
                    Automação oficial com opt-in
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-[#00C853]" />
                      {currentTemplate.statusLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Branco Flutuante em Destaque (Fiel à Imagem de Referência) */}
              <div className="absolute top-12 -left-2 -right-2 bg-white text-zinc-900 rounded-2xl p-4 shadow-[0_22px_55px_rgba(0,0,0,0.92)] border border-zinc-200 z-20">
                <p className="text-xs font-extrabold text-zinc-900">
                  {currentTemplate.clientGreeting}
                </p>
                <p className="text-xs text-zinc-700 mt-1 leading-snug">
                  {currentTemplate.messageBody}
                </p>
                <p className="text-xs text-zinc-700 mt-0.5">{currentTemplate.footerText}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPresenceConfirmed(true)}
                    className="bg-[#00C853] hover:bg-[#00C853]/90 text-white font-bold text-xs px-4 py-2 rounded-full shadow transition-all cursor-pointer"
                  >
                    {presenceConfirmed ? '✓ Presença confirmada' : currentTemplate.buttonText}
                  </button>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {currentTemplate.time} ✓✓
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Central: Título, Descrição e Botão de Exemplos */}
          <div className="lg:col-span-4 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Automatize seu WhatsApp
              <br />
              <span className="text-[#FF7900]">e traga clientes de volta.</span>
            </h2>

            <p className="text-[#A1A1AA] text-sm sm:text-base leading-relaxed">
              Confirmações, lembretes, promoções e mensagens de reativação automáticas, sem
              trabalho manual.
            </p>

            <button
              type="button"
              onClick={handleCycleTemplate}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-[0_10px_28px_rgba(255,121,0,0.35)] transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Ver exemplos de mensagens</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#00C853] shrink-0" />
              <span>
                Envios realizados mediante consentimento do cliente, com opção simples de opt-out.
              </span>
            </p>
          </div>

          {/* Coluna Direita: Cards de Automação */}
          <div className="lg:col-span-4 space-y-3">
            {WHATSAPP_TEMPLATES.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPresenceConfirmed(false);
                    setSelectedIndex(idx);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#171717] border-[#00C853]/50 shadow-[0_8px_28px_rgba(0,200,83,0.12)]'
                      : 'bg-[#111111] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#00C853]/15 border border-[#00C853]/35 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-[#00C853]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">{item.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

