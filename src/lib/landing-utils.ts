export type ConversionEventName =
  | 'hero_cta_click'
  | 'demo_started'
  | 'pricing_viewed'
  | 'plan_selected'
  | 'signup_started'
  | 'signup_completed'
  | 'first_booking_created'
  | 'subscription_started';

export interface ConversionEventPayload {
  section?: string;
  planId?: string;
  planName?: string;
  ctaLabel?: string;
  step?: string;
  value?: number;
}

const brlFormatterTwoDecimals = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlFormatterZeroDecimals = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formata valores monetários no padrão brasileiro (ex: R$ 300,00)
 */
export function formatBRL(value: number): string {
  return brlFormatterTwoDecimals.format(value);
}

/**
 * Formata valores monetários inteiros no padrão brasileiro (ex: R$ 50)
 */
export function formatCompactBRL(value: number): string {
  return brlFormatterZeroDecimals.format(value);
}

/**
 * Fórmula oficial da calculadora interativa de receita:
 * receitaPotencial = ticketMedio * horariosPerdidos * percentualRecuperacao / 100
 */
export function calculatePotentialRevenue(
  ticketMedio: number,
  horariosPerdidos: number,
  percentualRecuperacao: number
): {
  receitaMensal: number;
  projecaoAnual: number;
} {
  const receitaMensal = (ticketMedio * horariosPerdidos * percentualRecuperacao) / 100;
  const projecaoAnual = receitaMensal * 12;

  return {
    receitaMensal,
    projecaoAnual,
  };
}

/**
 * Camada centralizada de instrumentação do funil de conversão (CRO).
 * Não coleta nem transmite dados pessoais (PII).
 */
export function trackConversionEvent(
  eventName: ConversionEventName,
  payload: ConversionEventPayload = {}
): void {
  if (typeof window === 'undefined') return;

  const eventEntry = {
    event: eventName,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    ...payload,
  };

  try {
    // 1. Dispara CustomEvent para observabilidade local ou extensões de analytics
    window.dispatchEvent(new CustomEvent('barbeariapro:conversion', { detail: eventEntry }));

    // 2. Integra automaticamente com dataLayer / gtag caso configurado no ambiente
    const win = window as unknown as {
      dataLayer?: Array<Record<string, unknown>>;
      gtag?: (cmd: string, name: string, params?: Record<string, unknown>) => void;
    };

    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push(eventEntry);
    }

    if (typeof win.gtag === 'function') {
      win.gtag('event', eventName, payload as Record<string, unknown>);
    }

    // 3. Registra histórico da sessão atual sem PII (máximo 50 eventos)
    const rawHistory = window.sessionStorage.getItem('barbeariapro_funnel_events');
    const history = rawHistory ? (JSON.parse(rawHistory) as Array<unknown>) : [];
    history.push(eventEntry);
    window.sessionStorage.setItem(
      'barbeariapro_funnel_events',
      JSON.stringify(history.slice(-50))
    );
  } catch {
    // Falha silenciosa caso storage esteja bloqueado pelo navegador
  }
}

/**
 * Navegação suave para âncoras da página respeitando o header fixo
 */
export function scrollToSection(sectionId: string): void {
  if (typeof window === 'undefined') return;
  const target = document.getElementById(sectionId.replace(/^#/, ''));
  if (!target) return;

  const headerOffset = 80;
  const elementPosition = target.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.scrollY - headerOffset;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: offsetPosition,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

