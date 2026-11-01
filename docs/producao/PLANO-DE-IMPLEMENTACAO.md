# Plano de implementação para produção

Data-base: 30/10/2026. Diagnóstico: [estudo](ESTUDO-DO-SISTEMA.md). Evidências e casos: [validação](VALIDACAO-DOS-FLUXOS.md).

Objetivo: permitir que uma barbearia configure o negócio, receba um agendamento, execute o atendimento, registre um recebimento e confira os números com isolamento, integridade e recuperação operacional comprovados.

**Estado:** as principais correções das fases 1–5 foram implementadas localmente e verificadas por build e integração HTTP/PostgreSQL. A contenção de dois serviços Redis da VPS também foi executada de forma limitada e está registrada em [ANALISE-VPS.md](ANALISE-VPS.md). O BarberPro ainda não foi publicado; os itens restantes e bloqueios estão em [STATUS-IMPLEMENTACAO.md](STATUS-IMPLEMENTACAO.md). Este plano continua sendo a referência de aceite para o lançamento.

## 1. Escopo de lançamento proposto

Entrega mínima: cadastro/login seguros; equipe e serviços; agenda pública e interna; clientes; vendas de serviços/produtos; estoque confiável; indicadores conciliados; administração geral; backup e monitoramento.

WhatsApp somente habilitado quando houver provedor e teste real. Cobrança SaaS automática somente anunciada quando assinatura e eventos de pagamento estiverem implementados e homologados. Alternativa de piloto: cobrança manual explicitamente informada e controlada, com política de ativação/suspensão documentada.

Não incluir nesta etapa: app nativo, IA, marketplace, fidelidade complexa ou migração para microsserviços.

## 2. Decisões de produto a consolidar na fase inicial

| Decisão | Proposta de partida | Por que importa |
|---|---|---|
| Pacotes e ciclos | Separar `planTier` de `billingInterval`; uma tabela central de preços/recursos | Hoje tier e duração estão confundidos |
| Cobrança do software | Piloto manual ou provedor com webhook; escolher antes da oferta pública | Cadastro atual não confirma pagamento |
| PIX de atendimento | Aprovação manual auditada no primeiro lançamento; não afirmar conciliação automática | Upload não comprova crédito bancário |
| Identidade do cliente | Verificação de contato e sessão para histórico; token temporário restrito para confirmação | Nome/telefone digitado não prova titularidade |
| Acesso da equipe | ADMIN gerencia; MANAGER opera conforme permissões; EMPLOYEE vê a própria agenda quando vinculado | Roles atuais não são aplicados em todas as APIs |
| Receita | Recebimentos confirmados no caixa; atendimento realizado em métrica distinta | Evitar misturar produção com dinheiro recebido |
| Visitas | Uma visita por atendimento efetivamente concluído | Compra de produto e repetição de pagamento não criam visita |
| Agendamento | Intervalos com início/fim e fuso da empresa; somente profissional habilitado | Duração e concorrência precisam de fonte única |

Essas propostas permitem iniciar o trabalho técnico; mudanças comerciais devem atualizar os testes e a comunicação antes da publicação.

## 3. Fases, dependências e critérios de aceite

### Fase 0 — Baseline reproduzível e ambiente de homologação

**Dependência:** nenhuma. **Estimativa:** 2–4 dias úteis de trabalho técnico.

- P0-001: preservar cópia dos fontes e estabelecer versionamento; confirmar repositório remoto apropriado antes de qualquer envio.
- P0-002: corrigir os fechamentos excedentes das duas páginas e executar a verificação completa. Tratar erros adicionais revelados, inclusive recuperação legada.
- P0-003: escolher npm ou pnpm, manter um lockfile e fixar runtime/gerenciador suportados. Tornar instalação e geração Prisma explícitas.
- P0-004: corrigir o comando de lint para execução direta do ESLint e unificar configuração. Adicionar comandos de typecheck, integração e E2E.
- P0-005: revisar Next/React e dependências com avisos oficiais; atualizar para patch suportado compatível. Separar correção imediata de segurança de eventual migração maior e homologar ambas.
- P0-006: resolver download/instalação dos engines do Prisma; validar schema. Criar banco de teste isolado, sem apontar testes à base local existente.
- P0-007: comparar migration inicial com schema atual; gerar migrations incrementais revisadas. Testar banco vazio e uma cópia descartável com dados antigos. Produção usa migrations versionadas, sem `db push` ad hoc.
- P0-008: criar `.env.example` com nomes e instruções, sem segredos ou dados de demonstração operacionais. Validar configuração no startup.
- P0-009: corrigir dependência de download de fontes no build: rede controlada ou fontes locais versionadas. O build atual falhou em Geist e Geist Mono além dos erros de sintaxe.

**Aceite:** checkout limpo instala, gera Prisma, passa typecheck/lint/build e inicia em homologação; migrations aplicam em banco vazio e em cópia de dados; nenhum teste alcança banco operacional. Artefatos: logs de CI e instruções reproduzíveis.

### Fase 1 — Identidade, isolamento e acesso

**Dependência:** fase 0. **Estimativa:** 4–7 dias.

- P0-101: remover a rota pública de seed, sua chamada na home, botão no login e auto-seed da autenticação. Bootstrap do proprietário em comando administrativo com segredo individual; demo em ambiente separado.
- P0-102: eliminar segredo JWT padrão; falhar startup sem segredo seguro. Validar assinatura/expiração/tipo do token; não aceitar token apenas decodificado como autorização.
- P0-103: definir sessão revogável, cookie HttpOnly/Secure em produção, proteção de requisições mutáveis e política de expiração. Retirar token de localStorage e resposta pública quando desnecessário.
- P0-104: verificar usuário/empresa ativos em requisições e invalidar sessões em suspensão, troca de senha e remoção de acesso. Logout revoga a sessão no servidor.
- P0-105: recuperação por token aleatório forte, hash em repouso, uso único, expiração e canal verificado. Resposta uniforme sem código; limitar solicitações e tentativas. Contemplar proprietário do sistema.
- P0-106: política central de permissões e escopo de empresa para todas as rotas. Verificar proprietário do registro e de cada relacionamento recebido. Ajustar constraints do banco quando aplicável.
- P0-107: remover histórico público sem identidade. Criar sessão de cliente verificado; link de confirmação com token restrito, temporário e revogável, sem usar apenas o ID.
- P0-108: rate limiting por identidade/IP nos fluxos públicos; limites de payload e trilha de eventos sem senhas/tokens/PII desnecessária.
- P0-109: schemas compartilhados de validação para cadastro, login, agenda, vendas e configurações; limites numéricos, tipos, normalização de telefone/e-mail e respostas 400/401/403/404/409 consistentes.
- P1-110: convite de usuários, vínculo opcional User–Employee, edição de acesso e MFA para proprietário/admin conforme suporte adotado.

**Aceite:** empresa A nunca consulta/vincula/altera registros de B; usuário suspenso perde acesso com sessão antiga; token falso/expirado é rejeitado; recuperação não revela código; confirmação não funciona sem token válido; matriz de papéis é testada por endpoint.

### Fase 2 — Cadastros e integridade do banco

**Dependência:** fases 0 e 1. **Estimativa:** 3–5 dias.

- P0-201: migrar dinheiro para Decimal com escala definida ou centavos inteiros. Revisar dados, arredondamento, transporte JSON e frontend.
- P0-202: arquivar serviços, produtos, profissionais e clientes quando possuírem histórico; impedir cascatas destrutivas em agenda/vendas. Exclusão definitiva somente em processo explícito e auditado.
- P0-203: salvar snapshots de nome/preço/duração/custos/comissão necessários para histórico, sem recalcular fatos passados por cadastro atual.
- P1-204: telefone normalizado e estratégia de unicidade por empresa; relatório e tratamento de duplicados antes da constraint.
- P1-205: índices orientados às consultas de empresa/data/status, telefone, vendas e campanhas. Medir planos e volume antes de índices adicionais.
- P1-206: configurações validadas por seção, atualizações parciais seguras e segredos de provedor protegidos no servidor. GET não devolve credenciais em texto para qualquer funcionário.
- P1-207: paginação e filtros em listagens; evitar carregar todos os clientes para calcular avaliações e todos os logs de campanhas em cada acesso.

**Aceite:** arquivar cadastro preserva agenda e venda; mudanças de preço não alteram histórico; contatos equivalentes não criam duplicidade involuntária; atualização de horário preserva localização; listagens têm limite e ordenação estável.

### Fase 3 — Agenda única e consistente

**Dependência:** fases 1 e 2. **Estimativa:** 4–6 dias.

- P0-301: extrair serviço de disponibilidade e reserva, usado pela agenda interna, portal público e remarcação.
- P0-302: início/fim, duração congelada, fuso da empresa e conversão consistente; regras de abertura, almoço, antecedência, horizonte, feriados/folgas e profissional ativo/habilitado.
- P0-303: conflito por interseção de intervalos; usar proteção transacional/constraint de exclusão por profissional no PostgreSQL ou mecanismo equivalente com garantia de concorrência. Avaliar solução com a versão PostgreSQL adotada; simples consulta antes de inserir não basta.
- P0-304: aplicar mesmas regras no PATCH; bloquear IDs estrangeiros, serviço inativo, datas inválidas e situações incompatíveis.
- P0-305: máquina de estados explícita; impedir confirmação de cancelado/concluído sem operação administrativa específica. Cancelamento respeita política e guarda autor/motivo.
- P0-306: idempotência da reserva e atualização atômica dos efeitos; falha em notificação não deve produzir agendamento duplicado na repetição.
- P1-307: estado de conflito 409 na UI, atualização dos horários disponíveis, prevenção de submissão repetida e acessibilidade dos controles.

**Aceite:** duas reservas simultâneas para o mesmo intervalo geram uma reserva e um conflito; serviço de 60 minutos às 10h bloqueia 10h30; remarcação segue a mesma regra; o resultado persiste corretamente em lista, calendário e confirmação.

### Fase 4 — Caixa, estoque e indicadores

**Dependência:** fases 1–3. **Estimativa:** 5–8 dias.

- P0-401: calcular preços/total no servidor com catálogo ou snapshot de agendamento; quantidade inteira positiva, desconto autorizado e sem valores NaN/negativos.
- P0-402: baixa condicional de estoque em transação e idempotência por venda; definir se estoque de pagamento pendente é reservado ou debitado e como é liberado.
- P0-403: separar venda, pagamento e movimentação de estoque. Modelar estorno/cancelamento com registros compensatórios, autor, motivo e idempotência; impedir exclusão destrutiva.
- P0-404: transições de pagamento e atendimento com efeitos exatamente uma vez. Bloquear dupla quitação integral do mesmo atendimento, sem impedir meios divididos se suportados no escopo.
- P0-405: separar visitas concluídas de gasto efetivamente recebido; reconciliação que detecta e corrige acumulados antigos com registro auditável.
- P1-406: fechamento de caixa real se mantido na oferta: sessão, abertura, saldo inicial, entradas/saídas, sangria/suprimento, conferência por meio e divergência.
- P1-407: comprovante em armazenamento privado com limite/tipo/tamanho e URLs temporárias; não guardar imagens base64 em respostas de listagem.
- P0-408: dashboard e gráficos derivados das mesmas fontes; receita recebida, pendência e atendimento realizado separados. Incluir estornos e período/fuso correto.
- P1-409: análise de serviços com custo histórico; chamar corretamente margem estimada quando salários, impostos e despesas não estiverem modelados. Comissões com regra e registro de competência/repasse se forem ofertadas.

**Aceite:** cenário com serviço R$45 e dois produtos de R$5 gera R$55 recebidos; estoque cai duas unidades e visita sobe uma vez. Repetir requisição não duplica. Estorno recompõe os efeitos previstos. Dashboard, caixa e relatório conciliam centavo a centavo.

### Fase 5 — Comunicações e contratação comercial

**Dependência:** identidade estável, agenda e caixa conciliados. **Estimativa:** 4–8 dias; depende dos provedores.

- P0-501: exigir autenticação/permissão para envio, escopo de empresa e limites de gasto. Proibir destinos de API arbitrários e proteger credenciais; impedir acesso a endereços internos indevidos.
- P1-502: adapter de provedor, timeout/retry limitado, outbox em transação e worker agendado autenticado. Não marcar DELIVERED por HTTP 200 de aceitação.
- P1-503: guardar ID da mensagem e tratar webhook assinado; estados queued/accepted/sent/delivered/read/failed conforme evidência real do provedor.
- P1-504: campanhas com elegibilidade só por visita concluída, consentimento/preferências, limite por cliente/ciclo e deduplicação. Remover fallback para todos e distinguir campanha de retorno de lembrete de agendamento.
- P1-505: usar o mesmo pipeline para envio manual, confirmação e lembrete. O link `wa.me` é ação manual, não prova de entrega e não deve duplicar disparo automático.
- P0 comercial-506: catálogo único de planos e direitos; assinatura/fatura, expiração, carência e eventos de pagamento idempotentes se cobrança automática estiver no escopo. Nunca ativar por retorno do navegador.
- P1-507: administração geral distingue receita contratada, prevista, recebida e inadimplência; trilha para alterações de plano, suspensão e eventual exclusão.
- P1-508: informações públicas verificáveis: avaliações reais ou indicação de ausência, funcionamento por hora/fuso, comodidades cadastradas e proximidade apenas se implementada.

**Aceite:** mensagem real entregue ao contato de teste possui ID e webhook; falha do provedor aparece como falha, sem sucesso fictício; repetição do job não duplica. Contratação paga só muda estado por evento validado. No piloto manual, registro e política de ativação são explícitos e auditáveis.

### Fase 6 — Operação, homologação e lançamento

**Dependência:** fases anteriores dos módulos habilitados. **Estimativa:** 3–5 dias, além de observação do piloto.

- P0-601: CI com instalação limpa, geração Prisma, typecheck, lint, build, testes PostgreSQL e E2E crítico. Homologação separada, sem segredos de produção.
- P0-602: logs estruturados com ID de requisição, erros correlacionados, métricas/alertas de API, jobs, mensagens e falhas de autenticação; redigir dados sensíveis.
- P0-603: backup automatizado, teste real de restauração e runbook. Proposta inicial a confirmar com operação: RPO de até 24h no piloto e RTO de até 4h; ajustar ao SLA comercial antes de vender garantia.
- P0-604: plano de deploy com migration compatível, smoke tests, rollback da aplicação e estratégia de restauração dos dados; não assumir rollback destrutivo de schema.
- P1-605: assets estáticos versionados, retirar caminho local da hero; headers de segurança, HTTPS, CSP compatível e cache sem dados privados compartilhados.
- P1-606: testes em desktop e celular, teclado, leitura de erros, loading/empty/error, duplo clique e conexão interrompida.
- P0-607: executar matriz do relatório de validação com duas empresas isoladas; anexar passos, esperado/obtido, registro de banco, logs e capturas.
- P1-608: documentação de suporte, uso de dados, retenção/exclusão e contatos; revisar textos e políticas aplicáveis com responsável pelo negócio antes da oferta.

**Aceite:** matriz crítica aprovada, restauração demonstrada, alertas funcionando, rollback ensaiado e piloto acompanhado sem divergência financeira ou exposição de dados.

## 4. Estimativa consolidada

As estimativas acima somam **25–43 dias úteis de esforço técnico**, sem prometer data de publicação. Há trabalho de teste em todas as fases, além da homologação final. Prazos externos de aprovação de provedores, definição comercial e migração de dados podem ampliar esse intervalo.

Um piloto com cobrança manual e WhatsApp desabilitado pode reduzir o escopo da fase 5, mas mantém integralmente os bloqueios de identidade, isolamento, agenda, caixa e recuperação operacional. Evitar tratar a soma como orçamento fechado antes de resolver a fase 0 e medir os erros adicionais de compilação/migration.

## 5. Portão de liberação

- [ ] Nenhuma vulnerabilidade P0 aberta nos módulos publicados.
- [ ] Instalação limpa e CI aprovados na revisão exata a publicar.
- [ ] Banco vazio e migração de cópia com dados homologados; restauração aprovada.
- [ ] Dois tenants, três papéis internos e proprietário testados, incluindo sessão suspensa e IDs estrangeiros.
- [ ] Jornada cliente → agenda → atendimento → recebimento → estoque → indicadores aprovada no navegador e banco.
- [ ] Corridas de agenda, estoque, confirmação de pagamento e repetição de webhook sem duplicidade.
- [ ] Mensagens/cobranças habilitadas somente com evidência real ou oferta explícita de operação manual.
- [ ] Oferta, preços, limites e telas coerentes com o que realmente está implementado.
- [ ] Monitoramento, suporte, backup e rollback com responsáveis definidos.

## 6. Primeira sequência de implementação recomendada

1. Preservar baseline, corrigir sintaxe e restaurar toolchain/Prisma.
2. Remover seed público e corrigir recuperação de senha/histórico público.
3. Centralizar sessão, papéis e isolamento das relações entre empresas.
4. Corrigir agenda e financeiro antes de adicionar novos recursos.
5. Homologar o fluxo completo com banco isolado; depois conectar comunicações e cobrança.

A auditoria `scripts/audit-production.cjs` é um diagnóstico da implementação atual. Seus casos que reproduzem falhas devem ser substituídos por testes de regressão que exijam comportamento seguro durante a implementação; não usá-la sozinha como condição de aprovação de produção.
