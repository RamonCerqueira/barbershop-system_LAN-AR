'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '@/data/landing-content';
import { scrollToSection, trackConversionEvent } from '@/lib/landing-utils';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ['inicio', 'funcionalidades', 'sistema-completo', 'agendamento-cliente', 'automacao-whatsapp', 'planos', 'depoimentos', 'contato'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id === 'sistema-completo' || id === 'agendamento-cliente' || id === 'automacao-whatsapp') {
              setActiveSection('funcionalidades');
            } else {
              setActiveSection(id);
            }
          }
        });
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0.05 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
    scrollToSection(sectionId);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080808]/90 backdrop-blur-md border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.65)]'
          : 'bg-gradient-to-b from-[#080808]/90 via-[#080808]/45 to-transparent border-b border-white/[0.05]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        {/* Logo BarbeariaPro */}
        <a
          href="#inicio"
          onClick={(e) => handleNavClick(e, 'inicio')}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900] rounded-lg"
          aria-label="BarbeariaPro — Voltar ao início"
        >
          <Scissors className="w-6 h-6 text-[#FF7900] -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
          <span className="text-xl font-extrabold tracking-tight text-white">
            Barbearia<span className="text-[#FF7900]">Pro</span>
          </span>
        </a>

        {/* Navegação Central Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.sectionId;
            return (
              <a
                key={item.sectionId}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.sectionId)}
                className={`relative py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900] rounded ${
                  isActive ? 'text-white font-semibold' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {item.label}
                <span
                  className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-[#FF7900] transition-all duration-300 ${
                    isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* CTAs à Direita Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg border border-white/20 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/35 text-sm font-medium text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900]"
          >
            Entrar
          </Link>
          <Link
            href="/contratar"
            onClick={() =>
              trackConversionEvent('signup_started', {
                section: 'header',
                ctaLabel: 'Criar minha conta',
              })
            }
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-bold text-sm shadow-[0_0_20px_rgba(255,121,0,0.4)] hover:shadow-[0_0_28px_rgba(255,121,0,0.65)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Criar minha conta
          </Link>
        </div>

        {/* Botão Menu Mobile */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2.5 text-[#A1A1AA] hover:text-white rounded-lg border border-white/10 bg-[#111111]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900]"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#080808]/98 backdrop-blur-xl border-b border-white/10 px-6 py-5 space-y-3 shadow-2xl">
          <nav className="flex flex-col space-y-1" aria-label="Menu mobile">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.sectionId;
              return (
                <a
                  key={item.sectionId}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.sectionId)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FF7900]/15 text-[#FF7900] font-semibold'
                      : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF7900]" />}
                </a>
              );
            })}
          </nav>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 text-center rounded-lg border border-white/20 bg-[#111111] text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/contratar"
              onClick={() => {
                setMobileMenuOpen(false);
                trackConversionEvent('signup_started', {
                  section: 'header_mobile',
                  ctaLabel: 'Criar minha conta',
                });
              }}
              className="py-3 text-center rounded-lg bg-gradient-to-r from-[#FF7900] to-[#FF9D00] text-black font-bold text-sm shadow-[0_0_18px_rgba(255,121,0,0.4)]"
            >
              Criar minha conta
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

