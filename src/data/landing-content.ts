export interface NavItem {
  label: string;
  href: string;
  sectionId: string;
}

export interface FeatureBarItem {
  id: string;
  iconName:
    | 'calendar'
    | 'monitor'
    | 'users'
    | 'package'
    | 'barchart'
    | 'whatsapp'
    | 'star'
    | 'smartphone';
  line1: string;
  line2: string;
  targetSection: string;
  description: string;
  highlightMetric: string;
}

export interface BookingServiceOption {
  id: string;
  name: string;
  price: number;
  duration: string;
  avatar: string;
  description: string;
}

export interface BookingBarberOption {
  id: string;
  name: string;
  specialty: string;
  rating: string;
  avatar: string;
}

export interface WhatsAppAutomationTemplate {
  id: string;
  title: string;
  subtitle: string;
  clientGreeting: string;
  messageBody: string;
  footerText: string;
  buttonText: string;
  time: string;
  statusLabel: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  barbershop: string;
  location: string;
  quote: string;
  avatar: string;
  rating: number;
  isDemoSample: boolean;
}

export interface PricingPlanItem {
  id: 'essencial' | 'profissional' | 'elite';
  contractPlanKey: 'monthly' | 'quarterly' | 'annual';
  name: string;
  subtitle: string;
  referenceMonthlyPrice: number;
  systemCyclePrice: number;
  systemCycleLabel: string;
  highlighted: boolean;
  badgeText?: string;
  features: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', href: '#inicio', sectionId: 'inicio' },
  { label: 'Funcionalidades', href: '#funcionalidades', sectionId: 'funcionalidades' },
  { label: 'Planos', href: '#planos', sectionId: 'planos' },
  { label: 'Depoimentos', href: '#depoimentos', sectionId: 'depoimentos' },
  { label: 'Contato', href: '#contato', sectionId: 'contato' },
];

export const FEATURES_BAR_ITEMS: FeatureBarItem[] = [
  {
    id: 'agendamento-online',
    iconName: 'calendar',
    line1: 'Agendamento',
    line2: 'Online',
    targetSection: 'agendamento-cliente',
    description: 'Link exclusivo 24h por dia com escolha de serviço, barbeiro, data e horário sem conflitos.',
    highlightMetric: 'Agenda sincronizada em tempo real',
  },
  {
    id: 'caixa-pdv',
    iconName: 'monitor',
    line1: 'Caixa PDV',
    line2: 'e Financeiro',
    targetSection: 'sistema-completo',
    description: 'Abertura e fechamento de caixa, entradas, saídas, PIX com comprovante e fluxo diário.',
    highlightMetric: 'Controle total de entradas e saídas',
  },
  {
    id: 'comissoes',
    iconName: 'users',
    line1: 'Comissões por',
    line2: 'profissional',
    targetSection: 'sistema-completo',
    description: 'Cálculo automático de percentuais por serviço e produto vendido para cada barbeiro.',
    highlightMetric: 'Zero erro em fechamento de equipe',
  },
  {
    id: 'estoque',
    iconName: 'package',
    line1: 'Controle de',
    line2: 'Estoque',
    targetSection: 'sistema-completo',
    description: 'Baixa automática em vendas e serviços, alertas de estoque mínimo e custo de insumos.',
    highlightMetric: 'Alertas automáticos de reposição',
  },
  {
    id: 'curva-abc',
    iconName: 'barchart',
    line1: 'Curva ABC',
    line2: 'de Produtos e Serviços',
    targetSection: 'sistema-completo',
    description: 'Identifique exatamente quais serviços e produtos geram 80% do lucro real da barbearia.',
    highlightMetric: 'Análise de rentabilidade A, B e C',
  },
  {
    id: 'automacao-whatsapp',
    iconName: 'whatsapp',
    line1: 'Automação',
    line2: 'WhatsApp',
    targetSection: 'automacao-whatsapp',
    description: 'Confirmações de horário, lembretes anti-falta e campanhas para recuperar clientes inativos.',
    highlightMetric: 'Redução drástica de faltas (no-show)',
  },
  {
    id: 'fidelizacao',
    iconName: 'star',
    line1: 'Fidelização',
    line2: 'de Clientes',
    targetSection: 'automacao-whatsapp',
    description: 'Histórico completo de visitas, frequência, preferências de corte e alertas de retorno.',
    highlightMetric: 'Histórico de visitas por cliente',
  },
  {
    id: 'app-cliente',
    iconName: 'smartphone',
    line1: 'Aplicativo',
    line2: 'do Cliente',
    targetSection: 'agendamento-cliente',
    description: 'Experiência mobile rápida pelo navegador sem exigir download na loja de aplicativos.',
    highlightMetric: 'Agendamento em menos de 30 segundos',
  },
];

export const BOOKING_SERVICES_DEMO: BookingServiceOption[] = [
  {
    id: 'corte',
    name: 'Corte Masculino',
    price: 45,
    duration: '40 min',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    description: 'Degradê navalhado, social ou tesoura com finalização.',
  },
  {
    id: 'barba',
    name: 'Barba',
    price: 35,
    duration: '30 min',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    description: 'Alinhamento com toalha quente, navalha e hidratação.',
  },
  {
    id: 'combo',
    name: 'Corte + Barba',
    price: 65,
    duration: '1 h',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
    description: 'Pacote completo com desconto especial e bebida cortesia.',
  },
];

export const BOOKING_BARBERS_DEMO: BookingBarberOption[] = [
  {
    id: 'rafael',
    name: 'Rafael Costa',
    specialty: 'Especialista em Fade & Barba',
    rating: '5.0',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'lucas',
    name: 'Lucas Ferreira',
    specialty: 'Cortes Clássicos & Visagismo',
    rating: '4.9',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
  },
];

export const BOOKING_TIMES_DEMO: string[] = [
  '09:00',
  '10:00',
  '11:30',
  '14:30',
  '16:00',
  '18:30',
];

export const WHATSAPP_TEMPLATES: WhatsAppAutomationTemplate[] = [
  {
    id: 'confirmacao',
    title: 'Confirmação de agendamento',
    subtitle: 'Reduz faltas e otimiza sua agenda.',
    clientGreeting: 'Olá João! 👋',
    messageBody: 'Seu horário de Corte + Barba é hoje às 10:00.',
    footerText: 'Te esperamos!',
    buttonText: 'Confirmar presença',
    time: '09:00',
    statusLabel: 'Entregue e lido automaticamente',
  },
  {
    id: 'lembrete',
    title: 'Lembrete automático',
    subtitle: 'Enviado antes do horário.',
    clientGreeting: 'Tudo pronto, Mateus! 💈',
    messageBody: 'Lembrete: seu atendimento começa em 1 hora (14:30) com Rafael Costa.',
    footerText: 'Caso precise reagendar, avise por aqui.',
    buttonText: 'Confirmar presença',
    time: '13:30',
    statusLabel: 'Disparo preventivo 1h antes',
  },
  {
    id: 'retorno',
    title: 'Campanhas de retorno',
    subtitle: 'Clientes inativos recebem mensagens especiais.',
    clientGreeting: 'Fala Bruno, beleza? ✂️',
    messageBody: 'Faz 28 dias desde o seu último Corte + Barba! Que tal renovar o visual essa semana?',
    footerText: 'Toque abaixo para escolher seu horário.',
    buttonText: 'Agendar meu retorno',
    time: '10:15',
    statusLabel: 'Filtro inteligente de inatividade',
  },
  {
    id: 'relacionamento',
    title: 'Mensagens de relacionamento',
    subtitle: 'Pós-atendimento e datas importantes com opt-out respeitado.',
    clientGreeting: 'Obrigado pela visita, Carlos! ⭐',
    messageBody: 'Curtiu o resultado do seu corte hoje? Sua avaliação ajuda muito nossa equipe.',
    footerText: 'Envie SAIR a qualquer momento para pausar lembretes.',
    buttonText: 'Avaliar atendimento',
    time: '19:00',
    statusLabel: 'Envio com consentimento ativo',
  },
];

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: 'rafael-lima',
    name: 'Rafael Lima',
    barbershop: 'Barbearia RL',
    location: 'Salvador/BA',
    quote:
      'Minha agenda ficou muito mais organizada e os clientes não faltam mais. O WhatsApp faz toda a diferença.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    rating: 5,
    isDemoSample: true,
  },
  {
    id: 'carlos-mendes',
    name: 'Carlos Mendes',
    barbershop: 'Barbearia Mendes',
    location: 'Lauro de Freitas/BA',
    quote:
      'O controle financeiro e as comissões me ajudaram a ter mais lucro. Sistema simples e completo.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    rating: 5,
    isDemoSample: true,
  },
  {
    id: 'bruno-santos',
    name: 'Bruno Santos',
    barbershop: 'Barbearia Elite',
    location: 'Salvador/BA',
    quote:
      'O agendamento online trouxe muitos clientes novos. Hoje minha barbearia vive cheia.',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
    rating: 5,
    isDemoSample: true,
  },
];

export const PRICING_PLANS: PricingPlanItem[] = [
  {
    id: 'essencial',
    contractPlanKey: 'monthly',
    name: 'Essencial',
    subtitle: 'Para começar e organizar sua agenda.',
    referenceMonthlyPrice: 10,
    systemCyclePrice: 10,
    systemCycleLabel: 'Plano Mensal (R$ 10/mês)',
    highlighted: false,
    features: [
      'Agendamento online',
      'Até 2 profissionais',
      'Clientes e histórico',
      'Link de agendamento',
    ],
  },
  {
    id: 'profissional',
    contractPlanKey: 'quarterly',
    name: 'Profissional',
    subtitle: 'Para barbearias em expansão.',
    referenceMonthlyPrice: 29,
    systemCyclePrice: 30,
    systemCycleLabel: 'Ciclo Trimestral (R$ 30/trimestre)',
    highlighted: true,
    badgeText: 'Em destaque',
    features: [
      'Agenda completa',
      'Caixa PDV e financeiro',
      'Comissões por profissional',
      'Automação WhatsApp',
    ],
  },
  {
    id: 'elite',
    contractPlanKey: 'annual',
    name: 'Elite',
    subtitle: 'Para barbearias com alta demanda.',
    referenceMonthlyPrice: 59,
    systemCyclePrice: 120,
    systemCycleLabel: 'Ciclo Anual (R$ 120/ano)',
    highlighted: false,
    features: [
      'Todos os recursos',
      'Estoque e Curva ABC',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
];

