'use client';

import { useState } from 'react';
import {
  Calendar,
  Monitor,
  Users,
  Package,
  BarChart2,
  MessageSquare,
  Star,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { FEATURES_BAR_ITEMS, FeatureBarItem } from '@/data/landing-content';
import { scrollToSection } from '@/lib/landing-utils';

function renderFeatureIcon(iconName: FeatureBarItem['iconName']) {
  const iconClass = 'w-6 h-6 text-[#FF7900] group-hover:text-[#FFB000] transition-colors';
  switch (iconName) {
    case 'calendar':
      return <Calendar className={iconClass} />;
    case 'monitor':
      return <Monitor className={iconClass} />;
    case 'users':
      return <Users className={iconClass} />;
    case 'package':
      return <Package className={iconClass} />;
    case 'barchart':
      return <BarChart2 className={iconClass} />;
    case 'whatsapp':
      return <MessageSquare className={iconClass} />;
    case 'star':
      return <Star className={iconClass} />;
    case 'smartphone':
      return <Smartphone className={iconClass} />;
  }
}

export function FeaturesBar() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureBarItem>(FEATURES_BAR_ITEMS[0]);

  const handleFeatureClick = (item: FeatureBarItem) => {
    setSelectedFeature(item);
    scrollToSection(item.targetSection);
  };

  return (
    <section
      id="funcionalidades"
      aria-label="Principais funcionalidades do sistema BarbeariaPro"
      className="relative z-10 border-b border-white/[0.08] bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Grid dos 8 Ícones Horizontais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {FEATURES_BAR_ITEMS.map((item) => {
            const isSelected = selectedFeature.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleFeatureClick(item)}
                onMouseEnter={() => setSelectedFeature(item)}
                className={`group flex flex-col items-center text-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900] ${isSelected
                  ? 'bg-[#171717] border-[#FF7900]/50 shadow-[0_0_25px_rgba(255,121,0,0.12)]'
                  : 'bg-transparent border-transparent hover:bg-[#111111] hover:border-white/10'
                  }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSelected
                    ? 'bg-[#FF7900]/20 border border-[#FF7900]/50 scale-105'
                    : 'bg-[#111111] border border-white/10 group-hover:border-[#FF7900]/40 group-hover:bg-[#FF7900]/10'
                    }`}
                >
                  {renderFeatureIcon(item.iconName)}
                </div>
                <div className="text-xs font-medium text-[#A1A1AA] group-hover:text-white leading-tight">
                  <p className={isSelected ? 'text-white font-semibold' : ''}>{item.line1}</p>
                  <p className={isSelected ? 'text-[#FF9D00] font-semibold' : ''}>{item.line2}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Barra de explicação rápida contextual do item selecionado */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/30 text-[#FF9D00] font-semibold text-xs">
              {selectedFeature.line1} {selectedFeature.line2}
            </span>
            <span className="text-[#A1A1AA]">{selectedFeature.description}</span>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection(selectedFeature.targetSection)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF7900] hover:text-[#FF9D00] shrink-0 transition-colors cursor-pointer"
          >
            <span>Ver na prática</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

