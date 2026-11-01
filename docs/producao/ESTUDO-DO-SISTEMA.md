# Estudo do sistema e diagnóstico de produção

Data: 30/10/2026. Escopo: cópia local de `barbershop-system_LANÇAR`.

**Parecer: não liberar para produção no estado atual.** Há bloqueios de compilação, recuperação de senha insegura, alteração pública de dados de demonstração, exposição de históricos e inconsistências possíveis em agenda, estoque e financeiro.

Este documento descreve a implementação encontrada, não apenas as funcionalidades anunciadas no README. Complementos: [plano](PLANO-DE-IMPLEMENTACAO.md), [validação](VALIDACAO-DOS-FLUXOS.md), [evidências dos handlers](auditoria-handlers.json) e [inventário dos fontes](inventario-fontes.json).

## 1. Método e limites

- Inventário automatizado de 77 arquivos TypeScript/TSX em `src`, incluindo 19 páginas e 32 arquivos `route.ts`, com hashes e diagnóstico sintático.
- Leitura das entidades Prisma, autenticação, middleware, contratos entre telas e APIs, regras das rotas e script de campanhas.
- Execução de auditoria dos handlers reais com adaptadores de autenticação, banco e rede simulados. Não houve escrita no PostgreSQL nem envio externo nessa auditoria.
- Execução do TypeScript; inspeção do ambiente sem registrar valores secretos; teste TCP do PostgreSQL local.
- Dependências restauradas por `npm ci --ignore-scripts --no-audit --no-fund`. O comando concluiu com 429 pacotes. Isso restaura a versão existente, sem atualizar a segurança da stack.
- **Nenhum fluxo foi aprovado como E2E em navegador + API + banco.** As duas páginas com erro sintático e a falha de obtenção do engine Prisma bloqueiam essa aprovação. Credenciais de WhatsApp, SMTP e pagamento também estão vazias.
- Porta 5432 acessível confirma conexão TCP, não autenticação, integridade dos dados, migrations ou saúde do PostgreSQL.
- Não foi identificado repositório Git válido nessa pasta. Não há histórico/diff confiável disponível nesta análise.
- Não foram corrigidas regras do produto nesta etapa: o pedido é estudo e planejamento. Os arquivos adicionados são documentação e auditoria.

## 2. Como funciona hoje

O produto é um monólito Next.js 15.4.6 com App Router, React 19.1.0, TypeScript e Tailwind 4. As telas usam `fetch`/`apiFetch`; as rotas Next acessam PostgreSQL por Prisma 6.14.0. Não foi encontrado backend separado, fila de mensagens ou suíte E2E configurada.

### Atores

| Ator | Entrada | Identidade e acesso atuais |
|---|---|---|
| Visitante | `/` e `/contratar` | Landing, demonstração e formulário de contratação |
| Proprietário da barbearia | `/login` → `/dashboard` | `User` com `companyId` e papel ADMIN/MANAGER/EMPLOYEE |
| Proprietário do sistema | `/login` → `/admin` | Entidade `SystemOwner`, com APIs exclusivas |
| Cliente final | `/cliente` e `/cliente/barbearia/[id]` | Nome/telefone armazenados no navegador; não há identidade verificada |
| Destinatário de confirmação | `/confirm/[id]` | O ID do agendamento é usado como acesso público |
| Executor de campanhas | Script npm | Consulta banco e registra logs; não implementa entrega real |

`Employee` é o profissional operacional; `User` é a conta de acesso. Cadastrar um colaborador **não cria uma credencial de login**. O modelo atual não estabelece o vínculo entre ambos nem fornece um fluxo completo de convite, aceitação e gestão de permissões.

### Jornada principal

1. A landing apresenta o produto e encaminha ao cadastro.
2. O cadastro cria empresa, usuário ADMIN, configurações e notificação dentro de transação; emite JWT e entra no painel imediatamente.
3. A empresa cadastra serviços, custos, colaboradores, especialidades, produtos e clientes.
4. O cliente encontra uma barbearia, escolhe serviço, profissional, data e horário e agenda pela API pública. A recepção pode fazer o mesmo pelo painel.
5. O atendimento passa por estados como SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED e NO_SHOW.
6. O caixa registra serviço ou produto, forma de pagamento e eventual comprovante PIX. As vendas podem atualizar atendimento, estoque e acumulados do cliente.
7. Dashboard, análise de serviços e painel geral agregam dados; notificações informam eventos.
8. Campanhas selecionam clientes e criam logs. Um endpoint separado tenta enviar mensagens quando há provedor configurado.

### Relações importantes

- `Company` agrupa usuários, serviços, profissionais, produtos, clientes, agendamentos, vendas e configurações.
- `Appointment` referencia cliente, serviço, profissional e empresa.
- `Sale` referencia opcionalmente cliente e agendamento; `SaleItem` referencia produto.
- `ServiceCost` guarda custo atual por uso; não há custo histórico por atendimento.
- `WhatsAppCampaignLog` guarda estado por campanha e cliente; não há identificador obrigatório de mensagem externa ou deduplicação por ciclo.
- Configurações são JSON, sem um contrato de domínio central validado para cada seção.

## 3. Pontos fortes

1. **Cobertura do negócio:** os módulos cobrem boa parte da operação diária de uma barbearia, com ligação entre agenda, clientes, serviços e caixa.
2. **Base tecnológica concentrada:** frontend e APIs no mesmo projeto facilitam correções e publicação inicial. Não há razão identificada para reescrever tudo ou adotar microsserviços agora.
3. **Modelagem relacional útil:** entidades separadas para custos, especialidades e itens de venda permitem evoluir relatórios e controles.
4. **Isolamento iniciado:** muitas listagens e verificações de edição usam `companyId` vindo da autenticação. Isso é uma base aproveitável, embora incompleta nos relacionamentos.
5. **Transações em operações relevantes:** criação de empresa, vendas e alterações de certas entidades já usam transações.
6. **Senhas com bcrypt:** há hash com fator 12; o principal problema está no fluxo de recuperação, nas contas padrão e na gestão de sessões.
7. **Existem estados operacionais:** agendamentos e pagamentos não dependem apenas de texto livre. Falta impor transições e efeitos consistentes.
8. **Experiência de entrada desenhada:** contratação por etapas, portal do cliente, agenda em lista/calendário e configuração de horários já têm telas e endpoints correspondentes.

Esses pontos foram constatados no código; não representam aprovação funcional em navegador.

## 4. Problemas e impacto

| ID | Prioridade | Evidência | Impacto e direção da correção |
|---|---|---|---|
| BUILD-01 | P0 | `cliente/barbearia/[id]/page.tsx:358–360` e `dashboard/caixa/page.tsx:702–706` contêm fechamentos excedentes; TypeScript retorna TS1128/TS1109 | Bloqueia compilação. Remover trechos excedentes e executar análise completa novamente |
| SEC-01 | P0 | `/api/seed` expõe GET/POST sem autenticação; `page.tsx:23` chama o seed ao carregar | Um acesso à home pode regravar senhas padrão. Remover da aplicação pública; provisionamento administrativo fora de HTTP |
| SEC-02 | P0 | `auth/forgot-password` retorna `code`; login o preenche automaticamente | Quem conhece e-mail pode obter código e trocar senha. Entrega por canal verificado, token forte de uso único, limites e revogação |
| SEC-03 | P0 | GET público de agendamentos usa filtro vazio sem telefone/e-mail; busca por telefone usa `contains` | Lista dados de terceiros sem prova de identidade. Autenticar cliente e restringir histórico no servidor |
| SEC-04 | P0 | GET/PATCH público por ID retorna dados e muda status sem segredo adicional | ID vazado permite consultar/alterar atendimento; transições não verificam estado atual. Link com token opaco, validade, escopo e transições |
| AUTH-01 | P0 | `getAuthUser` aceita payload assinado sem consultar usuário/empresa ativos | Suspender empresa impede novo login, mas token emitido pode continuar operando até expirar. Revogar/revalidar sessões |
| AUTH-02 | P0 | Middleware apenas decodifica JWT; fallback conhecido e `.env` local confirmado com segredo de exemplo (sem expor valor); token também vai ao localStorage; cookie sem Secure explícito | Um segredo conhecido compromete a confiança no JWT também nas APIs. Exigir segredo individual e rotacionar/revogar sessões; sessão revogável em cookie HttpOnly/Secure em produção. Não foi inspecionada configuração de um deploy externo |
| TENANT-01 | P0 | Criação/edição de agenda não valida empresa de todos os IDs; venda aceita `clientId`/`appointmentId` sem escopo em alguns acessos | Pode vincular ou atualizar registros de outra empresa. Carregar todas as relações no escopo autenticado e reforçar integridade no banco |
| RBAC-01 | P0 | APIs de empresa geralmente exigem apenas `companyId`, sem checar `auth.role` | EMPLOYEE pode alcançar operações administrativas por API. Matriz de permissões e verificações centralizadas |
| BOOK-01 | P0 | Conflito é apenas data/profissional/`time` idêntico, separado da inserção | Dois horários diferentes podem se sobrepor; chamadas simultâneas podem reservar o mesmo intervalo. Motor único com duração, restrições e controle no banco |
| BOOK-02 | P0 | PATCH de agenda não verifica conflito; servidor não aplica todas as configurações | Remarcação pode colidir; aceita data passada, horário fechado/intervalo e vínculo inativo. Validar regras também no servidor |
| CASH-01 | P0 | Venda usa `amount`, `unitPrice` e quantidade do cliente; quantidade negativa passa | Total adulterado e aumento de estoque por venda negativa. Recalcular total no servidor; validar inteiros positivos e descontos autorizados |
| CASH-02 | P0 | Estoque: consulta, checa e depois decrementa; pagamento não tem chave idempotente | Corrida de estoque e cobrança/venda duplicada. Decremento condicional, transação e chave única de operação |
| CASH-03 | P0 | DELETE da venda apenas apaga; rejeição não estorna efeitos anteriores | Divergência entre estoque, visitas, gastos e financeiro. Substituir exclusão por estorno auditado e idempotente |
| DATA-01 | P0 | Valores monetários em Float; relacionamentos de serviço/profissional/cliente com Cascade para agendamentos | Erros de arredondamento e perda de histórico ao excluir cadastro. Decimal/centavos, snapshots e arquivamento |
| MSG-01 | P0 se habilitado | Envio WhatsApp obtém auth, mas não rejeita ausência; sem provedor retorna DELIVERED | Uso indevido de credenciais globais e entrega fictícia. Exigir permissão, quota e configuração; falha explícita se indisponível |
| MSG-02 | P1 | Disparo de campanha e script criam logs sem chamar provedor; fallback envia para todos os clientes ativos quando ninguém é elegível | UI anuncia disparo que não ocorreu e pode selecionar público incorreto. Worker, outbox, elegibilidade consistente e webhooks |
| CONFIG-01 | P1 | PUT de settings reconstrói `locationConfig` mesmo em atualização de outra seção | Atualização parcial pode apagar localização. Contrato por seção e merge explícito; credenciais somente no servidor |
| METRIC-01 | P1 | Dashboard usa `Math.max` entre recebimentos e preços de atendimentos concluídos | Mistura atendimento realizado com recebimento; gráficos e cartões podem divergir. Definir fonte única e regime de cada indicador |
| COST-01 | P1 | Análise chama receita menos insumos de `netProfit`; usa custo atual para todo histórico | Não representa lucro líquido nem custo histórico; ignora comissões e despesas. Exibir margem de contribuição estimada ou modelar custos reais |
| PLAN-01 | P1/P0 comercial | Landing tem tiers Essencial/Profissional/Elite e preços de referência 10/29/59; contrato/cadastro usam ciclos 10/30/120 | `tier` da URL não é persistido nem controla recursos; ciclos e pacotes são confundidos. Catálogo único e cobrança explícita |
| BILL-01 | P0 para SaaS pago | Empresa ativa no cadastro; não há entidade de assinatura/fatura nem webhook de pagamento | Seleção de plano não equivale a contratação paga. Implementar assinatura ou lançar piloto com cobrança manual claramente definida |
| SIGNUP-01 | P1 | API aceita senha de um caractere e CPF só com 11 dígitos; telefone ausente vira número fictício no frontend | Cadastro inválido e identificação incorreta. Schema server-side, normalização e fluxo de contato verificado |
| DISCOVERY-01 | P1 | Busca é textual; aberto/fechado considera dia sem hora; avaliações e comodidades incluem padrões fixos | Anúncios de proximidade, avaliação e funcionamento não têm sustentação completa. Implementar dados reais ou ajustar oferta |
| OPS-01 | P0 | Sem pipeline de checks/E2E no projeto; dois lockfiles; dependências locais inicialmente incompletas | Build não reproduzível. Escolher gerenciador, fixar runtime e estabelecer CI, homologação e rollout |
| MIGRATION-01 | P0 | A migration inicial não contém `SalePaymentStatus` nem `proofUrl`, presentes no schema atual | Instalar apenas pelas migrations não reproduz o banco esperado pela aplicação. Criar e testar migrations incrementais, sem presumir o estado do banco existente |
| BUILD-02 | P0 no ambiente auditado | `npm run build` também falha ao baixar Geist/Geist Mono de Google Fonts, com EACCES | Garantir rede de build ou empacotar fontes locais com licença adequada; falha ambiental distinta da sintaxe do produto |
| ASSET-01 | P1 | `/api/hero-image` usa caminho absoluto de Windows e pode copiar arquivo em GET | Dependência da máquina e escrita em runtime. Versionar o asset público e usar URL estática |
| TECH-01 | P1 | `auth/forgotPassword/routes.ts` não é rota válida de App Router e referencia `User.phone`, ausente no schema | Código legado pode quebrar tipagem após corrigir sintaxe. Remover/unificar recuperação |

P0 bloqueia lançamento; P1 precisa de correção antes de habilitar o módulo afetado. Auditoria de handlers reproduz parte desses problemas; os demais são conclusões de inspeção do código ou dos comandos, conforme o relatório de validação.

## 5. O que existe versus o que está incompleto

| Área | Implementado | Limite atual |
|---|---|---|
| Cadastro | Empresa, conta, configurações, login automático | Sem confirmação de contato, assinatura ou validação robusta no servidor |
| Serviços/custos | CRUD e análise ABC | Falta histórico de preços/custos e regras numéricas completas |
| Colaboradores | Cadastro, comissão configurada, especialidades | Não equivale a gestão de contas; cálculo/repasse de comissão não está fechado |
| Produtos | CRUD e baixa na venda | Sem razão de movimentação/reconciliação; concorrência e estorno incompletos |
| Caixa | Registro de venda e aprovação manual PIX | Não há fechamento de caixa modelado, saldo inicial, sangria/suprimento ou conciliação completa |
| Clientes | Cadastro, acumulados e histórico básico | Perfil público não verifica titular; duplicidade de telefone e histórico frágeis |
| Agenda | Lista, calendário, agendamento público | Conflito, duração, fuso, bloqueios e transições precisam de regra central |
| WhatsApp | Configuração e tentativa de envio em endpoint | Campanhas e script não enviam de fato; não há confirmação de entrega real |
| Admin geral | Gestão de empresas, suspensão e visão agregada | Receita estimada não é recebida; faltam assinatura, auditoria e revogação efetiva |
| Notificações | Listagem por empresa e marcar como lidas | `userId` não restringe visibilidade na listagem da empresa; revisar privacidade e estado por usuário |
| Operação | Projeto local e migration inicial | Banco limpo/restauração, deploy, logs, alertas e recuperação não homologados |

## 6. Sugestão de direção

**Preservar a base e concentrar o primeiro lançamento em uma operação confiável.** Evitar adicionar fidelidade, aplicativo nativo, IA ou marketplace antes de fechar segurança, agenda e caixa.

- Adotar módulos de domínio dentro do próprio Next: identidade, empresas, catálogo/equipe, agenda, vendas/estoque e comunicações. Rotas e telas devem reutilizar as mesmas regras.
- Preferir piloto controlado com poucas barbearias após correção dos bloqueadores. Se cobrança automática não fizer parte da primeira entrega, declarar cobrança manual e remover promessas de contratação automatizada.
- Unificar marca BarberPro/BarbeariaPro, planos e mensagens. Mostrar apenas informações reais; demonstração deve ser isolada do banco operacional.
- Criar onboarding verificável: dados → horários → profissional → serviço → primeiro agendamento → primeiro recebimento.
- Priorizar UX móvel da recepção e do cliente, feedback de falha, prevenção de duplo clique e acessibilidade. Validar isso em navegador após o projeto compilar.
- Separar status de atendimento, status de recebimento e status de mensagem; um não comprova o outro.
- Adotar testes de integração com PostgreSQL de teste e E2E dos percursos críticos, incluindo adversários entre duas empresas.

## 7. Referências consultadas

- [Aviso oficial do Next.js de 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026): publicou correções em 15.5.28 e 16.4.1. A dependência local 15.4.6 deve ser revista; revalidar o patch mais recente ao executar a implementação. A aplicabilidade de cada vulnerabilidade depende das funcionalidades usadas e do ambiente; não foi feita exploração dessas CVEs.
- [Política oficial de suporte](https://nextjs.org/support-policy): usar linha suportada e atualizada. Isso não substitui a correção das falhas de negócio identificadas.
- [OWASP — recuperação de senha](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html): resposta uniforme, entrega por canal separado, token forte e de uso único, limite de tentativas.
- [OWASP — sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): proteção de cookies e ciclo de vida/revogação da sessão.
- [Prisma — transações](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions): referência de desenho para isolamento e idempotência; conferir a documentação da versão efetivamente escolhida, pois o projeto está no Prisma 6.
