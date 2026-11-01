'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Scissors,
  ChevronRight,
  Clock,
  Bell,
  Share2,
  Sparkles,
  Check,
  Calendar,
  User,
} from 'lucide-react';
import {
  BOOKING_SERVICES_DEMO,
  BOOKING_BARBERS_DEMO,
  BOOKING_TIMES_DEMO,
} from '@/data/landing-content';
import { trackConversionEvent } from '@/lib/landing-utils';

export function ClientBooking() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
  const [selectedBarberIdx, setSelectedBarberIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState('Hoje');
  const [selectedTime, setSelectedTime] = useState('10:00');

  const chosenService = BOOKING_SERVICES_DEMO[selectedServiceIdx];
  const chosenBarber = BOOKING_BARBERS_DEMO[selectedBarberIdx];

  const handleConfirmBookingDemo = () => {
    setStep(4);
    trackConversionEvent('first_booking_created', {
      section: 'client_booking_demo',
      step: 'confirmed',
      value: chosenService.price,
    });
  };

  return (
    <section
      id="agendamento-cliente"
      className="relative py-20 lg:py-24 overflow-hidden border-b border-white/[0.08] bg-[#111111]/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Coluna Esquerda: Título, Descrição e Botão */}
          <div className="lg:col-span-4 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Seu cliente agenda
              <br />
              do <span className="text-[#FF7900]">próprio celular.</span>
            </h2>
            <p className="text-[#A1A1AA] text-sm sm:text-base leading-relaxed">
              Agendamento online simples e rápido, com os serviços, profissionais e horários da sua
              barbearia. Teste as etapas no celular ao lado ou abra o portal real do cliente.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/cliente"
                onClick={() =>
                  trackConversionEvent('demo_started', {
                    section: 'client_booking',
                    ctaLabel: 'Ver como funciona',
                  })
                }
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-[0_10px_28px_rgba(255,121,0,0.35)] transition-all hover:-translate-y-0.5"
              >
                <span>Ver como funciona</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>

            {/* Indicador de passos interativos */}
            <div className="pt-2">
              <p className="text-xs text-[#A1A1AA] mb-2">
                Navegue pelas etapas no celular interativo:
              </p>
              <div className="flex items-center gap-1.5">
                {[
                  { num: 1, label: '1. Serviço' },
                  { num: 2, label: '2. Barbeiro' },
                  { num: 3, label: '3. Horário' },
                  { num: 4, label: '4. Confirmado' },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${step === s.num
                      ? 'bg-[#FF7900] text-black font-bold'
                      : 'bg-[#171717] text-[#A1A1AA] hover:text-white border border-white/10'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Central: Smartphone Interativo com Fluxo Completo de Agendamento */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-[275px] bg-white text-zinc-900 rounded-[36px] border-[8px] border-zinc-800 shadow-[0_28px_70px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Topo do Celular */}
              <div className="bg-[#111111] text-white px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-[#FF7900]" />
                  Barbearia<span className="text-[#FF7900]">Pro</span>
                </span>
                <span className="text-[10px] text-[#FF9D00] font-semibold">
                  Etapa {step}/4
                </span>
              </div>

              {/* Conteúdo Dinâmico de Cada Etapa */}
              <div className="p-4 bg-zinc-50 min-h-[340px] flex flex-col justify-between">
                {step === 1 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-zinc-900">Escolha o serviço</p>
                      <span className="text-[10px] text-zinc-500">Toque para selecionar</span>
                    </div>
                    {BOOKING_SERVICES_DEMO.map((srv, idx) => {
                      const active = selectedServiceIdx === idx;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setSelectedServiceIdx(idx)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${active
                            ? 'bg-orange-50/90 border-[#FF7900] ring-1 ring-[#FF7900]/40'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                          <img
                            src={srv.avatar}
                            alt={srv.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div className="flex-1 leading-tight">
                            <p className="text-xs font-bold text-zinc-900">{srv.name}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              R$ {srv.price},00 • {srv.duration}
                            </p>
                          </div>
                          {active && (
                            <span className="w-5 h-5 rounded-full bg-[#FF7900] text-black flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-zinc-900">Escolha o profissional</p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[10px] text-[#FF7900] font-bold cursor-pointer"
                      >
                        Voltar
                      </button>
                    </div>
                    {BOOKING_BARBERS_DEMO.map((barber, idx) => {
                      const active = selectedBarberIdx === idx;
                      return (
                        <button
                          key={barber.id}
                          type="button"
                          onClick={() => setSelectedBarberIdx(idx)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${active
                            ? 'bg-orange-50/90 border-[#FF7900] ring-1 ring-[#FF7900]/40'
                            : 'bg-white border-zinc-200'
                            }`}
                        >
                          <img
                            src={barber.avatar}
                            alt={barber.name}
                            loading="lazy"
                            className="w-11 h-11 rounded-full object-cover shrink-0"
                          />
                          <div className="flex-1 leading-tight">
                            <p className="text-xs font-bold text-zinc-900">{barber.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{barber.specialty}</p>
                            <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                              ★ {barber.rating}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-zinc-900">Data e horário</p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[10px] text-[#FF7900] font-bold cursor-pointer"
                      >
                        Voltar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Hoje', 'Amanhã', 'Sábado'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${selectedDay === day
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-200'
                            }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold text-zinc-600 pt-1">
                      Horários livres com {chosenBarber.name}:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {BOOKING_TIMES_DEMO.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${selectedTime === time
                            ? 'bg-[#FF7900] text-black border-[#FF7900]'
                            : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-3 text-center py-3">
                    <div className="w-12 h-12 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <p className="text-sm font-extrabold text-zinc-900">Agendamento Confirmado!</p>
                    <div className="bg-white p-3 rounded-xl border border-zinc-200 text-left space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Serviço:</span>
                        <span className="font-bold text-zinc-900">{chosenService.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Profissional:</span>
                        <span className="font-bold text-zinc-900">{chosenBarber.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Quando:</span>
                        <span className="font-bold text-[#00C853]">
                          {selectedDay} às {selectedTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-1.5">
                        <span className="text-zinc-500">Valor:</span>
                        <span className="font-extrabold text-zinc-900">
                          R$ {chosenService.price},00
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão Inferior do Celular */}
                <div className="pt-3">
                  {step < 3 && (
                    <button
                      type="button"
                      onClick={() => setStep((step + 1) as 2 | 3)}
                      className="w-full text-center bg-gradient-to-r from-[#FF7900] to-[#FF9D00] hover:from-[#FF9D00] hover:to-[#FFB000] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Agendar agora
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      type="button"
                      onClick={handleConfirmBookingDemo}
                      className="w-full text-center bg-[#00C853] hover:bg-[#00C853]/90 text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Confirmar horário ({selectedTime})
                    </button>
                  )}
                  {step === 4 && (
                    <div className="space-y-1.5">
                      <Link
                        href="/cliente"
                        className="block w-full text-center bg-zinc-900 text-white font-bold text-xs py-2.5 rounded-xl"
                      >
                        Abrir Portal Real do Cliente
                      </Link>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-800 font-semibold py-1 cursor-pointer"
                      >
                        Simular outro agendamento
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: 4 Benefícios com Ícones Laranja */}
          <div className="lg:col-span-4 space-y-5">
            {[
              {
                icon: Clock,
                title: 'Disponível 24 horas por dia',
                desc: 'Seus clientes agendam mesmo fora do horário comercial.',
              },
              {
                icon: Bell,
                title: 'Reduz faltas',
                desc: 'Lembretes automáticos via WhatsApp.',
              },
              {
                icon: Share2,
                title: 'Mais clientes',
                desc: 'Seu link de agendamento pronto para divulgar nas redes sociais.',
              },
              {
                icon: Sparkles,
                title: 'Experiência moderna',
                desc: 'Seu cliente vê serviços, profissionais e horários em poucos cliques.',
              },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7900]/15 border border-[#FF7900]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComponent className="w-5 h-5 text-[#FF7900]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}

            {/* Resumo das etapas suportadas */}
            <div className="p-3.5 rounded-xl bg-[#171717] border border-white/[0.07] flex items-center justify-between text-xs text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF7900]" />
                Sem exigir download de app
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00C853]" />
                Sincronizado em tempo real
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

