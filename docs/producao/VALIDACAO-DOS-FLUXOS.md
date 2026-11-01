# Validação dos fluxos e roteiro de homologação

Data: 30/10/2026. **Resultado geral: produção reprovada; E2E pendente/bloqueado.**

Não interpretar inspeção de código ou sucesso de mock como operação confirmada em navegador e PostgreSQL. A matriz abaixo informa o nível de evidência de cada parte.

## 1. Evidências executadas

| Verificação | Resultado | Limite |
|---|---|---|
| Inventário/parse TypeScript de `src` | 77 fontes, 19 páginas, 32 rotas; 2 fontes com erros de sintaxe | Não executa interface |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Falhou com 9 erros TS1128/TS1109 em 2 páginas | Erros adicionais de tipo podem aparecer após a correção sintática |
| `npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000` | Concluído: 429 pacotes | Scripts pós-instalação não executados; não equivale a auditoria de vulnerabilidades |
| Prisma validate/generate | Falha no download do engine em `binaries.prisma.sh` | Schema/migration e acesso autenticado ao banco não foram aprovados |
| PostgreSQL localhost:5432 | Porta TCP aceitou conexão | Não é teste SQL nem valida schema/dados |
| `npm run build` | Falhou: erros sintáticos nas duas páginas e download de Geist/Geist Mono com EACCES | Nenhum artefato de produção aprovado |
| `npm run lint` | Falhou: parsing nas mesmas duas páginas; avisos de otimização de imagens na landing | Lint existe, mas não aprova o código atual; migração do comando está prevista na revisão de toolchain |
| Comparação textual migration/schema | Migration inicial não contém SalePaymentStatus nem proofUrl | Drift de arquivos confirmado; estado real do banco não consultado |
| Segredo JWT local | Confirmado uso do segredo de exemplo, sem registrar o valor | Não é inspeção de um ambiente remoto |
| Configuração externa | WhatsApp, SMTP e chaves de pagamento vazios | Entrega real, e-mail e cobrança não homologados |
| `node scripts/audit-production.cjs` | Executa handlers reais com adaptadores isolados; veja JSON final | Não usa middleware HTTP real, Prisma real, browser ou transação real |

Os resultados finais dos comandos adicionais de lint/build são registrados em `verificacoes-ambiente.json`.

## 2. Auditoria isolada reproduzível

Executar `node scripts/audit-production.cjs`. A execução atual grava [auditoria-handlers.json](auditoria-handlers.json).

- `kind: FINDING` + `REPRODUCED`: a auditoria confirmou um comportamento que falha no requisito de produção. Não é um teste de segurança aprovado.
- `kind: CONTRACT` + `REPRODUCED`: confirmou somente o contrato específico descrito, com dados simulados.
- `AUDIT_ERROR`: o próprio teste não conseguiu produzir evidência; corrigir o teste antes de tirar conclusão.

Execução final: **22 casos, 14 achados reproduzidos, 8 contratos confirmados e zero erros do harness**. Esse resultado confirma a necessidade de correção; não aprova o sistema.

Coberturas: seed, recuperação de senha, histórico, confirmação, reserva/remarcação, sessão, middleware, cadastro da empresa, atualização parcial de configuração, campanha, envio de mensagem, custo de serviço, notificações, acesso administrativo, busca pública e criação de serviços/profissionais/produtos/clientes.

**Nenhuma escrita real no banco e nenhuma mensagem enviada.** Os testes de propriedade estrangeira demonstram que os handlers não validam o vínculo; constraints/testes PostgreSQL ainda precisam confirmar e impedir o cenário real. O teste de middleware não demonstra acesso indevido às APIs, que verificam assinatura separadamente.

## 3. Matriz por parte do sistema

| Parte | Caminho completo rastreado | Evidência atual | Situação E2E |
|---|---|---|---|
| Landing | `/` → componentes/preços → `/contratar?plan=...&tier=...` | Inspeção; home chama seed e tier não é persistido | Pendente; sem aprovação visual/performance |
| Contratação | Formulário → POST companies/register → transação Company/User/Settings/Notification → cookie → dashboard | Contrato isolado reproduz validação fraca; transação inspecionada | Pendente em banco de teste; sem cobrança real |
| Login/logout | Formulário → auth/login → bcrypt → JWT/cookie → painel → logout | Inspeção; sessão não é revogada no servidor; middleware isolado aceita token falso | Pendente de execução HTTP/browser |
| Recuperação | Login → forgot-password → PasswordReset → reset-password → novo login | Código devolvido ao solicitante reproduzido | Reprovado por segurança; e-mail não configurado |
| Sessão/papéis/empresa | Cookie/Bearer → getAuthUser → autorização → operação de domínio | Payload aceito sem consulta de ativo; EMPLOYEE passa checks de operações comuns | Reprovado por desenho; testes multiempresa reais pendentes |
| Serviços | Formulário → services POST/PUT/DELETE → Service → lista → agenda | Criação isolada injeta tenant; CRUD/constraints inspecionados | Pendente; arquivamento/histórico não garantidos |
| Custos/análise ABC | Modal custo → service-costs POST → ServiceCost → GET métricas → análise | Criação isolada checa empresa; cálculo inspecionado | Pendente; lucro/custos históricos precisam de definição |
| Colaboradores | Cadastro → employees → specialties → lista/especialidades → agenda | Criação isolada injeta tenant; atualização transacional inspecionada | Pendente; profissional não ganha login automaticamente |
| Clientes | Cadastro → clients → histórico/acumulados → venda/agenda | Criação isolada injeta tenant; telefone não normalizado/único | Pendente; exclusão pode perder histórico |
| Produtos | Cadastro → products → catálogo caixa → saleItems → baixa/alerta | Contrato isolado e regra de baixa inspecionados | Pendente; negativo reproduzido e concorrência não garantida |
| Busca pública | `/cliente` → public/barbershops → detalhe/horários | Busca isolada filtra empresas ativas; estados/avaliações parcialmente fixos | Pendente em navegador/banco |
| Reserva online | Detalhe → public/barbershops/[id]?date → public/appointments POST → banco → confirmação | Falta de validação do profissional/intervalo reproduzida | Bloqueado por sintaxe em `page.tsx:358` |
| Agenda interna/lista | Lista → appointments GET/POST/PATCH → banco → lista e notificações | Reserva/alteração inspecionadas; remarcação aceita IDs sem escopo | Pendente; conflitos e transições reprovados |
| Calendário | Navegação mês → GET appointments?month → criação/status → link/WhatsApp | Contratos de tela/API rastreados; lista/calendário compartilham handlers | Pendente; mesmas falhas de reserva/alteração |
| Confirmação/cancelamento | `/confirm/[id]` → GET/PATCH public/appointments/[id] → notificação | Mudança pública sem token adicional reproduzida | Reprovado por segurança; política de prazo não aplicada |
| Histórico do cliente | Perfil local → GET public/appointments?phone → cards → confirmação | Query sem filtro lista registros; telefone informado não prova identidade | Reprovado por exposição de dados |
| Caixa serviço | Selecionar atendimento → POST sales → Sale + Appointment + Client → dashboard | Caminho rastreado; falta validar relações e impedir duplicidade | Bloqueado por sintaxe em `caixa/page.tsx:702` |
| Caixa produto | Produto/quantidade → POST sales → SaleItem + estoque + notificação → lista | Quantidade negativa e total independente reproduzidos | Bloqueado pela tela; regra financeira reprovada |
| PIX manual | Comprovante → sale PENDING → PATCH APPROVED/REJECTED → indicadores | Inspeção: imagem base64, transições/efeitos incompletos | Bloqueado pela tela; sem validação bancária |
| Estorno/exclusão | DELETE sales → banco → estoque/acumulados/dashboard | Exclusão sem compensação reproduzida | Reprovado; não há estorno contábil completo |
| Dashboard | GET dashboard → agregações → cards/gráfico | Inspeção: uso de Math.max, sem fonte única conciliada | Pendente e números não aprovados |
| Configurações | GET/PUT settings → Company/CompanySettings → horários/agenda | Atualização de uma seção apaga localização: reproduzido | Reprovado nesse caso; demais seções pendentes |
| Notificações | Layout → GET notifications → PATCH leitura/DELETE limpeza | Filtro por empresa confirmado isoladamente | Pendente; privacidade por usuário não implementada |
| WhatsApp manual | Calendário → send-whatsapp → provedor ou wa.me → retorno | Sem credenciais e sem auth retorna DELIVERED: reproduzido | Reprovado; entrega real não validada |
| Campanhas/recorrência | Campanha → trigger → seleção → logs; script → logs | Logs fictícios e fallback de público reproduzidos; script inspecionado | Reprovado; agendamento automático e entrega ausentes |
| Admin geral | admin → overview → companies PATCH/suspensão → sessão antiga | API rejeita usuário comum com 403 isoladamente; suspensão não revoga JWT | Pendente; bloqueio efetivo de empresa reprovado |
| Assinatura SaaS | Plano → cadastro → ativação → pagamento/renovação/suspensão | Ausência de assinatura/fatura/webhook na implementação | Não implementado como cobrança automática |
| Operação | Install → Prisma → build → deploy → logs → backup → restore | Install concluído; sintaxe e engine bloqueiam | Não homologado |

## 4. Massa de homologação obrigatória

Usar **outro banco**, descartável, com duas empresas A/B e dados sintéticos. Não reaproveitar usuários/senhas padrão nem rodar seed público.

- Proprietário do sistema; ADMIN, MANAGER e EMPLOYEE de A/B; profissional vinculado; empresa suspensa; sessão emitida antes da suspensão.
- Serviço corte R$45/60min, barba R$35/30min e serviço inativo; profissionais ativos/inativos e especialidades distintas.
- Produto água R$5 com estoque 10 e mínimo 2; produto com estoque 1; item inativo.
- Cliente verificado A, cliente B, contatos equivalentes com/sem máscara e cliente sem consentimento para campanha.
- Horário 09h–18h, pausa 12h–13h, dia fechado, folga individual, datas de limite e cenário de virada de dia em America/Sao_Paulo.
- Provedores de teste ou mocks contratuais separados de um pequeno teste real autorizado com destino de teste.

## 5. Percurso completo de cada módulo — passos e aceite

| Caso | Passos do fluxo | Resultado exigido no navegador/API/banco |
|---|---|---|
| E01 Landing/oferta | Abrir desktop/celular; consultar planos; selecionar pacote/ciclo; avançar ao cadastro | Mesmo pacote, preço e ciclo em todos os passos; nenhuma escrita de seed; demo identificada e isolada |
| E02 Empresa | Preencher cadastro; rejeitar CPF/e-mail/senha inválidos; cadastrar; entrar; sair; entrar novamente | Uma empresa, uma conta e settings consistentes; sem vazamento de hash/segredo; duplicado retorna 409; sem assinatura falsa |
| E03 Identidade | Login inválido/válido; token alterado/expirado; logout; suspender empresa com outra sessão aberta | 401/403 corretos; logout/suspensão revogam acesso; papéis não trocam acesso alterando localStorage |
| E04 Recuperação | Solicitar reset existente/inexistente; abrir e-mail de teste; usar token; repetir/expirar token; testar senha antiga e sessão anterior | Resposta não revela conta/código; troca única; senha antiga e sessões revogadas não funcionam; limitação de tentativas |
| E05 Serviços | Criar serviço; editar preço/duração; incluir custo; agendar; alterar preço; arquivar | Próximos atendimentos usam regra nova; anterior preserva snapshot; arquivo não apaga histórico |
| E06 Equipe | Cadastrar profissional e especialidades; convidar usuário; aceitar convite; restringir papel; inativar profissional | Login separado do cadastro operacional; agenda própria conforme permissão; inativo não recebe novas reservas |
| E07 Clientes | Cadastrar telefone com máscara; tentar equivalente; agendar; concluir; pagar; arquivar | Identidade consistente; uma visita por atendimento; gastos por recebimento; histórico preservado |
| E08 Produtos | Cadastrar estoque 10; editar; vender 2; atingir mínimo; tentar vender indisponível/quantidade negativa | Estoque 8 após venda; alerta no limite; valores negativos/fracionados indevidos rejeitados; catálogo inativo não é vendável |
| E09 Busca | Buscar nome/serviço/endereço; abrir detalhe; testar empresa inativa e sem serviços; consultar aberto/fechado | Somente empresa disponível; estado real por horário/fuso; nenhum dado pessoal desnecessário |
| E10 Reserva pública | Serviço 60min às 10h; tentar 10h30; testar pausa/dia fechado/passado; confirmar reserva válida | Conflitos 409; regras 400/422 conforme contrato; mesmo atendimento no banco, painel e portal |
| E11 Concorrência agenda | Enviar duas reservas simultâneas para o mesmo intervalo; repetir mesma chave após timeout | Uma reserva; uma resposta de conflito ou mesmo resultado idempotente; nenhum cliente/agendamento duplicado |
| E12 Lista/calendário | Criar na lista; visualizar calendário; remarcar; mudar profissional; filtrar mês/status; repetir PATCH | Mesma entidade em ambas as telas; conflitos/restrições iguais; transições inválidas recusadas |
| E13 Confirmação | Abrir link temporário válido; confirmar; repetir; cancelar conforme prazo; testar ID puro, token trocado/expirado | Sem token não lê/altera; repetição não duplica eventos; concluído não volta a confirmado publicamente |
| E14 Histórico | Cliente A verifica contato; abre histórico; tenta telefone/ID de B; sai | Histórico só do titular; B inacessível; logout remove acesso; sem consulta parcial por telefone |
| E15 Caixa serviço | Concluir atendimento R$45; receber; repetir request; tentar pagar outra empresa; conferir visita/gasto | Um recebimento conforme política; uma visita; R$45 gasto; duplicação e vínculo estrangeiro rejeitados |
| E16 Caixa produto/corrida | Vender 2 águas; forjar preço/total; tentar quantidade negativa; duas vendas simultâneas sobre estoque 1 | Total calculado no servidor; uma baixa válida por unidade disponível; estoque nunca negativo |
| E17 PIX manual | Anexar comprovante válido; rejeitar tipo/tamanho indevidos; pendência; aprovar; repetir; tentar transição proibida | Aprovação auditada uma vez; pendente não vira receita confirmada; arquivo privado; comprovante não equivale a conciliação bancária |
| E18 Estorno/fechamento | Receber e estornar venda; repetir estorno; fechar caixa; tentar lançamento retroativo não autorizado | Registro original preservado; compensação única; estoque/receita conciliados; fechamento e divergências auditados |
| E19 Indicadores | Serviço R$45 + 2 produtos R$5; pendente R$35; estorno de um produto; conferir caixa/dashboard/relatórios | Recebido líquido R$50; pendente R$35 separado; uma visita; mesmo corte temporal/fuso; nenhum Math.max entre fontes |
| E20 Custos/comissões | Atendimento com custo R$3,50; alterar custo depois; conferir margem e comissão | Histórico não muda; margem corretamente rotulada; se comissão ofertada, base/alíquota/repasse verificáveis |
| E21 Configurações | Salvar horários; recarregar; salvar só notificações; alterar contato/localização; consultar agenda pública | Cada seção preserva as outras; segredo não retorna ao browser; regras persistidas aplicadas no servidor |
| E22 Notificações | Gerar reserva/pagamento; abrir com dois usuários; marcar lida; tentar ID de outra empresa | Escopo e privacidade corretos; sem códigos de reset; estado de leitura conforme política por usuário |
| E23 WhatsApp | Enviar ao contato de teste; provocar timeout/401 do provedor; receber webhook de entrega; repetir evento | Estado apoiado em evidência externa; falha explícita; retry limitado; nenhum duplo envio |
| E24 Campanha | Clientes elegíveis/não elegíveis/sem consentimento; executar job duas vezes; webhook repetido | Só elegíveis consentidos; uma mensagem por ciclo; nenhum fallback para todos; empresa suspensa não dispara |
| E25 Admin | Editar empresa/plano; suspender; testar sessão antiga; reativar; consultar totais; tentativa por usuário comum | Ativação/suspensão efetivas e auditadas; usuário comum recebe 403; previsão separada de recebimento |
| E26 Cobrança SaaS | Contratar; simular confirmação/repetição/falha/renovação/cancelamento; evento assinado inválido | Assinatura muda só por fonte autorizada; eventos idempotentes; direitos iguais aos preços contratados. Se manual, testar processo manual documentado |
| E27 Tenant/RBAC | Repetir operações CRUD, agenda, venda, custo, notificações e envio com IDs de B e papéis de A | 403/404 sem dados ou efeitos em B, inclusive relacionamentos aninhados; permissões verificadas por endpoint |
| E28 Operação | Deploy homologação; health check; gerar falha; restaurar backup em outro banco; rollback; simular job parado | Alertas chegam; restauração íntegra; rollback demonstrado; segredos não aparecem em logs; recuperação dentro da meta |
| E29 UX | Todos os percursos críticos em celular e desktop; teclado; rede lenta/queda; duplo clique | Erros claros, foco/labels adequados, sem perda/duplicação silenciosa; telas não ficam presas em loading |

## 6. Como registrar a aprovação futura

Para cada E01–E29 anexar: revisão/hash do código, ambiente/versões, massa, passos, esperado, obtido, horário/fuso, request/response sem segredos, evidência SQL, log correlacionado e captura de tela quando houver UI. Resultado deve ser APROVADO, REPROVADO ou BLOQUEADO com causa; não usar apenas “testado”.

Critérios de conclusão: todos os casos críticos dos módulos publicados aprovados; testes negativos/concorrentes aprovados; zero P0 aberto; backup restaurado e reconciliação financeira comprovada. Funcionalidade adiada precisa ficar desabilitada e fora da oferta de lançamento.
