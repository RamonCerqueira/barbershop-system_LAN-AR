'use client';

import { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { TrustBar } from '@/components/landing/TrustBar';
import { FeaturesBar } from '@/components/landing/FeaturesBar';
import { SystemShowcase } from '@/components/landing/SystemShowcase';
import { ClientBooking } from '@/components/landing/ClientBooking';
import { WhatsAppAutomation } from '@/components/landing/WhatsAppAutomation';
import { RevenueCalculator } from '@/components/landing/RevenueCalculator';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';
import { InteractiveDemoModal } from '@/components/landing/InteractiveDemoModal';

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);


  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#FF7900] selection:text-black overflow-x-hidden">
      {/* 1. Header e Navegação */}
      <Header />

      <main>
        {/* 2. Hero Section com Fotografia Cinematográfica e Widgets Flutuantes */}
        <Hero onOpenDemo={() => setDemoModalOpen(true)} />

        {/* 3. Barra de Credibilidade */}
        <TrustBar />

        {/* 4. Barra Horizontal de 8 Funcionalidades */}
        <FeaturesBar />

        {/* 5. Demonstração do Sistema (Notebook + Smartphone) */}
        <SystemShowcase onOpenDemo={() => setDemoModalOpen(true)} />

        {/* 6. Agendamento pelo Cliente (Smartphone Interativo em 4 Etapas) */}
        <ClientBooking />

        {/* 7. Automação WhatsApp */}
        <WhatsAppAutomation />

        {/* 8. Calculadora Interativa de Receita */}
        <RevenueCalculator />

        {/* 9. Depoimentos */}
        <Testimonials />

        {/* 10. Planos e Preços */}
        <Pricing />

        {/* 11. CTA Final */}
        <FinalCTA />
      </main>

      {/* 12. Rodapé e Contato */}
      <Footer />

      {/* Modal Interativo de Demonstração do Sistema */}
      <InteractiveDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
