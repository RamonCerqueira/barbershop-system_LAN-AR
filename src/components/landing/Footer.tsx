'use client';

import Link from 'next/link';
import { Scissors, Mail, Phone, MapPin } from 'lucide-react';
import { scrollToSection } from '@/lib/landing-utils';

export function Footer() {
  return (
    <footer
      id="contato"
      className="border-t border-white/[0.08] bg-[#080808] pt-14 pb-10 text-xs text-[#A1A1AA]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Coluna 1: Marca */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#FF7900] -rotate-45" />
              <span className="text-lg font-extrabold text-white">
                Barbearia<span className="text-[#FF7900]">Pro</span>
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Sistema completo de gestão, agendamento online, caixa PDV, comissões, estoque, Curva
              ABC e automação WhatsApp para barbearias de alto padrão.
            </p>
          </div>

          {/* Coluna 2: Navegação */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Plataforma</h3>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('inicio')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('funcionalidades')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Funcionalidades
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('simulador-receita')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Simulador de Receita
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('planos')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Planos e Preços
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Acesso Rápido */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Acesso Rápido</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Entrar no Painel da Barbearia
                </Link>
              </li>
              <li>
                <Link href="/contratar" className="hover:text-white transition-colors">
                  Criar Conta da Barbearia
                </Link>
              </li>
              <li>
                <Link href="/cliente" className="hover:text-white transition-colors">
                  Portal de Agendamento do Cliente
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Contato e Suporte */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Contato</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                <a
                  href="mailto:contato@barbeariapro.com.br"
                  className="hover:text-white transition-colors"
                >
                  contato@barbeariapro.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                <span>Suporte Comercial Seg–Sáb, 08h às 20h</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                <span>Atendimento Nacional • Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BarbeariaPro. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/cliente" className="hover:text-white transition-colors">
              Portal do Cliente
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/contratar" className="text-[#FF7900] hover:text-[#FF9D00] font-semibold">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

