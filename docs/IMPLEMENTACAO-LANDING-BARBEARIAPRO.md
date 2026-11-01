# Documentação de Implementação — Landing Page Premium BarbeariaPro

## 1. Análise Inicial do Projeto Existente

### 1.1 Stack e Dependências Instaladas
Inspeção realizada em `package.json`, `tsconfig.json`, `src/app/layout.tsx` e `src/app/globals.css`:
- **Framework**: Next.js `15.4.6` (App Router, Turbopack habilitado no script `dev`)
- **Biblioteca UI**: React `19.1.0` & React DOM `19.1.0`
- **Linguagem**: TypeScript `^5` (`strict: true`)
- **Estilização**: Tailwind CSS `v4` (`@tailwindcss/postcss`)
- **Tipografia**: `Geist` e `Geist_Mono` via `next/font/google`
- **Ícones**: `lucide-react` (`^0.539.0`)
- **Formulários e Validação**: `react-hook-form` (`^7.62.0`), `@hookform/resolvers` (`^5.2.1`) e `zod` (`^4.0.17`)
- **ORM e Banco de Dados**: Prisma `^6.14.0` com SQLite (`prisma/dev.db`)
- **Autenticação**: JWT (`jsonwebtoken` + cookies HTTP-only `barberpro_token` validados em `src/middleware.ts`)

### 1.2 Mapeamento de Rotas, APIs e Fluxos Reais Preservados
| Rota / Endpoint | Função no Sistema | Integração com a Landing Page |
| :--- | :--- | :--- |
| `/` (`src/app/page.tsx`) | Landing Page principal | Composição modularizada com as 12 seções + Header + Footer + Modal de Demonstração |
| `/login` (`src/app/login/page.tsx`) | Login para Barbearias e Admin SaaS | Conectado ao botão **Entrar** do Header e ao acesso rápido de demonstração |
| `/contratar` (`src/app/contratar/page.tsx`) | Fluxo real de cadastro em 4 etapas com validação Zod | Conectado a todos os CTAs de conversão e seleção de planos (`?plan=monthly\|quarterly\|annual`) |
| `/cliente` (`src/app/cliente/page.tsx`) | Portal público onde clientes buscam barbearias e agendam | Conectado aos fluxos de demonstração do aplicativo do cliente |
| `/api/companies/register` | Criação real de conta empresarial + usuário admin + JWT | Consumido pelo formulário `/contratar` |
| `/api/public/barbershops` | Lista pública de barbearias ativas, serviços, equipe e horários | Consumido pela `TrustBar` e pelo componente interativo `ClientBooking` |
| `/api/hero-image` | Endpoint de entrega otimizada do banner fotográfico do Hero | Fornece a imagem cinematográfica `/hero-barber-banner.jpg` com cache imutável |
| `/api/seed` | Inicialização automática do banco de dados de demonstração | Acionado silenciosamente caso o ambiente esteja sem dados iniciais |

---

## 2. Identidade Visual e Design System

### 2.1 Paleta Oficial (Fidelidade à Referência)
| Token Semântico | Hexadecimal | Aplicação |
| :--- | :--- | :--- |
| Fundo Principal (`bg-primary`) | `#080808` | Background global da página e fusão inferior/esquerda do Hero |
| Fundo Secundário (`bg-secondary`) | `#111111` | Seções alternadas, faixas horizontais e rodapé |
| Superfícies (`surface`) | `#171717` | Cards de funcionalidades, depoimentos, simulador e planos |
| Laranja Principal (`brand-orange`) | `#FF7900` | Destaques tipográficos, ícones, bordas ativas e CTAs primários |
| Laranja Claro (`brand-orange-light`) | `#FF9D00` | Gradientes sutis de botões, brilhos e estados de hover |
| Destaque Dourado (`brand-gold`) | `#FFB000` | Estrelas de avaliação, selos e acentos luminosos |
| Texto Principal (`text-white`) | `#FFFFFF` | Títulos, números em destaque e rótulos principais |
| Texto Secundário (`text-muted`) | `#A1A1AA` | Subtítulos, descrições e textos de apoio |
| Estado Positivo (`status-green`) | `#00C853` | Badges de confirmação, status WhatsApp e valores recuperados |

### 2.2 Tipografia e Comportamento Visual
- **Fonte Principal**: `Geist` (`var(--font-geist-sans)`), configurada diretamente no `body` em `src/app/globals.css`.
- **Headlines**: Pesadas (`font-extrabold`), tracking compacto (`tracking-tight`), contraste imediato entre `#FFFFFF` e palavras-chave em `#FF7900`.
- **Fotografia do Hero**: Integrada diretamente ao fundo `#080808` através de máscaras de gradiente multidirecionais — **sem moldura, card ou container fechando o barbeiro**.

---

## 3. Arquitetura Modular de Componentes

```text
src/
  app/
    layout.tsx                         # Metadata global, OpenGraph, Schema.org e fonte Geist
    globals.css                        # Tokens de cor, animações suaves e suporte a prefers-reduced-motion
    page.tsx                           # Página principal enxuta que orquestra as 12 seções da Landing Page
  components/
    landing/
      Header.tsx                       # Header fixo translúcido com blur no scroll, indicador de seção ativa e menu mobile
      Hero.tsx                         # Banner cinematográfico full-bleed com barbeiro integrado ao fundo e CTAs reais
      HeroWidgets.tsx                  # 4 widgets flutuantes sobrepostos à cena (Próximo atendimento, Novo agendamento, Faturamento, WhatsApp)
      TrustBar.tsx                     # Barra horizontal com 4 indicadores verificáveis e benefícios objetivos
      FeaturesBar.tsx                  # Barra horizontal com 8 funcionalidades clicáveis e navegação contextual
      SystemShowcase.tsx               # Seção com Notebook (Dashboard real) + Smartphone (App Cliente) e abertura de demo
      ClientBooking.tsx                # Seção com mão segurando iPhone e fluxo de agendamento interativo em 4 etapas
      WhatsAppAutomation.tsx           # Seção com smartphone exibindo conversa de WhatsApp e 4 cards de automação
      RevenueCalculator.tsx            # Calculadora interativa de receita com 3 sliders e formatação Intl.NumberFormat('pt-BR')
      Testimonials.tsx                 # Carrossel de depoimentos com identificação transparente de dados demonstrativos
      Pricing.tsx                      # Seção de 3 planos (Essencial, Profissional em destaque, Elite) sincronizada com /contratar
      FinalCTA.tsx                     # Seção final cinematográfica de conversão
      Footer.tsx                       # Rodapé completo com canais de contato, links rápidos e conformidade LGPD
      InteractiveDemoModal.tsx         # Modal interativo para experimentar o sistema e acessar /cliente ou /login demo
  data/
    landing-content.ts                 # Dados tipados de todas as seções, planos, funcionalidades e automações
  lib/
    landing-utils.ts                   # Cálculo de receita, formatação BRL e camada de instrumentação de eventos CRO
```

---

## 4. Checklist das 12 Seções e Requisitos Técnicos

- [x] **1. Header e Navegação (`Header.tsx`)**: Logo BarbeariaPro com tesoura, links (Início, Funcionalidades, Planos, Depoimentos, Contato), indicador de seção ativa via `IntersectionObserver`, menu mobile e botões reais (`Entrar` -> `/login`, `Criar minha conta` -> `/contratar`).
- [x] **2. Hero Section (`Hero.tsx` + `HeroWidgets.tsx`)**: Fotografia cinematográfica integrada sem moldura, badge `SISTEMA COMPLETO PARA BARBEARIAS`, título `Sua barbearia mais cheia, organizada e lucrativa.`, 2 botões funcionais e 4 widgets flutuantes com dados identificados como demonstração.
- [x] **3. Barra de Credibilidade (`TrustBar.tsx`)**: 4 indicadores lado a lado com ícones em `#FF7900`, integrados com estatísticas reais do sistema e benefícios objetivos verificáveis.
- [x] **4. Barra de Funcionalidades (`FeaturesBar.tsx`)**: 8 ícones em `#FF7900` (Agendamento Online, Caixa PDV e Financeiro, Comissões por Profissional, Controle de Estoque, Curva ABC de Produtos e Serviços, Automação WhatsApp, Fidelização de Clientes, Aplicativo do Cliente) com hover e navegação contextual.
- [x] **5. Demonstração do Sistema (`SystemShowcase.tsx`)**: Notebook com interface fiel ao dashboard real + Smartphone com o app do cliente, botão `Testar agora gratuitamente` e `Ver todas as funcionalidades`.
- [x] **6. Agendamento pelo Cliente (`ClientBooking.tsx`)**: Smartphone em destaque com demonstração navegável em 4 passos (Serviço, Profissional, Data/Horário e Confirmação) + 4 benefícios laterais.
- [x] **7. Automação WhatsApp (`WhatsAppAutomation.tsx`)**: Smartphone com notificação de confirmação interativa, status de envio e 4 cards de automação respeitando opt-in/consentimento.
- [x] **8. Calculadora Interativa de Receita (`RevenueCalculator.tsx`)**: Fórmula `receitaPotencial = ticketMedio * horariosPerdidos * percentualRecuperacao / 100`, recálculo instantâneo, formatação `Intl.NumberFormat('pt-BR')` e aviso explícito de simulação ilustrativa.
- [x] **9. Depoimentos (`Testimonials.tsx`)**: Cards `#171717` com fotos, avaliação e identificação transparente de perfis demonstrativos preparados para avaliações reais.
- [x] **10. Planos e Preços (`Pricing.tsx`)**: Três planos (Essencial, Profissional com borda `#FF7900` e badge `Em destaque`, Elite) conectados aos planos reais de `/contratar`.
- [x] **11. CTA Final (`FinalCTA.tsx`)**: Fundo cinematográfico escurecido com título `Pronto para transformar sua barbearia?` e botão `Criar minha barbearia agora`.
- [x] **12. Footer (`Footer.tsx`)**: Navegação, seção de contato, links de acesso rápido e aviso de privacidade.
- [x] **13. Instrumentação CRO (`landing-utils.ts`)**: Eventos `hero_cta_click`, `demo_started`, `pricing_viewed`, `plan_selected`, `signup_started`, `signup_completed`, `first_booking_created`, `subscription_started`.
- [x] **14. SEO, Performance e Acessibilidade**: Metadata completa, Open Graph, Schema.org (`SoftwareApplication`), contraste acessível, navegação por teclado e suporte a `prefers-reduced-motion`.

