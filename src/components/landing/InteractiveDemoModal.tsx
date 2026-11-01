'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Scissors,
  Calendar,
  Monitor,
  Users,
  Package,
  BarChart2,
  MessageSquare,
  Star,
  Smartphone,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { FEATURES_BAR_ITEMS } from '@/data/landing-content';
import { trackConversionEvent } from '@/lib/landing-utils';

interface InteractiveDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveDemoModal({ isOpen, onClose }: InteractiveDemoModalProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeFeature = FEATURES_BAR_ITEMS[selectedTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-[#111111] border border-white/15 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Topo do Modal */}
        <div className="px-6 py-4 bg-[#171717] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scissors className="w-5 h-5 text-[#FF7900] -rotate-45" />
            <h2 id="demo-modal-title" className="text-base sm:text-lg font-extrabold text-white">
              Demonstração Interativa — Barbearia<span className="text-[#FF7900]">Pro</span>
            </h2>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#00C853]/15 border border-[#00C853]/30 text-[10px] font-bold text-[#00C853]">
              Ambiente de Exemplo Isolado
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar demonstração"
            className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 sm:p-8 grid md:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
          {/* Lista dos 8 Módulos Reais */}
          <div className="md:col-span-5 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-2">
              8 Módulos Integrados
            </p>
            {FEATURES_BAR_ITEMS.map((item, idx) => {
              const isSelected = selectedTab === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTab(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF7900]/15 border-[#FF7900] text-white'
                      : 'bg-[#171717]/60 border-white/5 text-[#A1A1AA] hover:text-white hover:border-white/15'
                  }`}
                >
                  <span>
                    {item.line1} {item.line2}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 ${isSelected ? 'text-[#FF7900]' : 'text-zinc-600'}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Detalhes do Módulo e Acessos Reais */}
          <div className="md:col-span-7 flex flex-col justify-between bg-[#080808] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/30 text-xs font-bold text-[#FF9D00]">
                {activeFeature.iconName === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'monitor' && <Monitor className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'users' && <Users className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'package' && <Package className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'barchart' && <BarChart2 className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'star' && <Star className="w-3.5 h-3.5" />}
                {activeFeature.iconName === 'smartphone' && <Smartphone className="w-3.5 h-3.5" />}
                <span>
                  {activeFeature.line1} {activeFeature.line2}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white">{activeFeature.highlightMetric}</h3>

              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                {activeFeature.description}
              </p>

              <div className="p-4 rounded-xl bg-[#171717] border border-white/10 space-y-2 text-xs text-zinc-300">
                <p className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00C853]" />
                  Experimente o ambiente real agora mesmo:
                </p>
                <p className="text-[#A1A1AA]">
                  Você pode testar a visão do cliente fazendo um agendamento de demonstração ou
                  acessar o painel administrativo completo com 1 clique na tela de login.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/cliente"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#171717] hover:bg-white/10 border border-white/20 text-white font-bold text-xs transition-all"
              >
                <Smartphone className="w-4 h-4 text-[#FF7900]" />
                <span>Testar Visão do Cliente</span>
              </Link>

              <Link
                href="/login"
                onClick={() => {
                  trackConversionEvent('demo_started', {
                    section: 'demo_modal',
                    ctaLabel: 'Acessar Painel Demo',
                  });
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold text-xs shadow-[0_8px_25px_rgba(255,121,0,0.4)] transition-all"
              >
                <span>Acessar Painel Demo</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

