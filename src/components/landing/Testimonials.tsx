'use client';

import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { TESTIMONIALS_DATA, TestimonialItem } from '@/data/landing-content';

interface TestimonialsProps {
  items?: TestimonialItem[];
}

export function Testimonials({ items = TESTIMONIALS_DATA }: TestimonialsProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const handlePrev = () => {
    setHighlightedIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setHighlightedIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <section
      id="depoimentos"
      className="py-16 lg:py-20 border-t border-b border-white/[0.08] bg-[#111111]/45"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Cabeçalho da Seção + Setas de Navegação */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                O que os barbeiros dizem
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-medium text-[#A1A1AA]">
                Exemplos demonstrativos de layout
              </span>
            </div>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Estrutura preparada para avaliações verificadas de barbearias parceiras do sistema.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Depoimento anterior"
              className="w-9 h-9 rounded-full bg-[#171717] border border-white/15 hover:border-[#FF7900]/50 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo depoimento"
              className="w-9 h-9 rounded-full bg-[#171717] border border-white/15 hover:border-[#FF7900]/50 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grid de 3 Cards Escuros */}
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, idx) => {
            const isHighlighted = highlightedIndex === idx;
            return (
              <article
                key={item.id}
                onClick={() => setHighlightedIndex(idx)}
                className={`bg-[#171717] border rounded-2xl p-6 flex gap-4 items-start transition-all cursor-pointer ${isHighlighted
                  ? 'border-[#FF7900]/45 shadow-[0_12px_35px_rgba(0,0,0,0.65)]'
                  : 'border-white/[0.08] hover:border-white/20'
                  }`}
              >
                <img
                  src={item.avatar}
                  alt={`Foto de ${item.name}`}
                  loading="lazy"
                  className="w-12 h-12 rounded-full object-cover border border-[#FF7900]/40 shrink-0"
                />
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-[#FFB000]">
                      {[...Array(item.rating)].map((_, sIdx) => (
                        <Star key={sIdx} className="w-3.5 h-3.5 fill-[#FFB000] text-[#FFB000]" />
                      ))}
                    </div>
                    {item.isDemoSample && (
                      <span className="text-[9px] text-zinc-500 border border-white/10 rounded px-1.5 py-0.5">
                        Demo
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>

                  <div className="pt-1">
                    <p className="text-xs font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-[#A1A1AA]">
                      {item.barbershop} — {item.location}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


