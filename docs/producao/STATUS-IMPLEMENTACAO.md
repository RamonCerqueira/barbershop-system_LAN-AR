# Status da implementação

Atualizado em 31/10/2026. O estudo e a linha de base permanecem preservados; este arquivo registra as mudanças e o estado do preview publicado.

## O que foi implementado

- Sessões com JWT forte, vínculo de sessão revogável no PostgreSQL, cookies protegidos, logout, proteção de origem e limites de requisição.
- Cadastro de empresa com validação, bootstrap do primeiro proprietário por CLI, endpoint público de seed desativado e recuperação de senha com código de uso único e envio SMTP configurável.
- Regras comuns de agendamento, duração, intervalos, concorrência e idempotência; token privado de confirmação; cancelamento em vez de exclusão física pelo fluxo de atendimento.
- Precisão monetária decimal, validação de preços no servidor, transações idempotentes para vendas, estoque, pagamentos e estornos, trilha de auditoria e movimentos de estoque.
- Comprovantes privados com validação de tipo/tamanho, autorização e armazenamento persistente configurável.
- Fila de mensagens com consentimento desativado por padrão, tentativas limitadas, configuração de provedor protegida e verificação de assinatura no webhook.
- Migrações versionadas, verificação de ambiente, saúde da aplicação, configuração de cabeçalhos e modelos de implantação isolada em systemd/Nginx.
- Next.js atualizado para 15.5.28; `.env` local recebeu um novo segredo JWT. Não copie esse arquivo para o servidor.
- Preview publicado em `https://barberpro.genioplay.com.br`, em usuário, serviço systemd, porta local `127.0.0.1:3214`, banco `barberpro_prod`, role PostgreSQL e site Nginx próprios.
- O build foi executado na VPS Linux; sete migrations foram aplicadas somente ao banco novo e vazio. A rota `/api/health` e a homepage retornaram 200 por HTTPS; HTTP redireciona para HTTPS. Certificado Let's Encrypt emitido com renovação automática.
- Unidade com limites iniciais de 512 MiB, 75% CPU, 128 tarefas, `NoNewPrivileges`, `PrivateTmp` e filesystem protegido. Segredos ficam em `/opt/barberpro/shared/app.env` com modo 0600. Banco não tem proprietário bootstrapado; nenhum cadastro/dado real foi criado.
- O hash do `nginx.conf` global e dos sites existentes Pirambeira e MGBP permaneceu idêntico após a publicação; Nginx e PostgreSQL continuaram ativos.

## Verificações concluídas

- `npm run typecheck`: passou.
- `npm run lint`: passou anteriormente sem erros; restam avisos de imagens `<img>` na página pública.
- `node scripts/test-integration.cjs --http`: 30 cenários passaram em PostgreSQL descartável, incluindo testes de handlers reais e percursos HTTP do login até logout, venda e agendamento/confirmacão.
- `npm run build`: passou localmente e novamente na VPS Linux; gerou as 45 páginas estáticas e rotas dinâmicas. O lint interno do build reportou avisos de `<img>`.
- `node scripts/audit-production.cjs`: não validou os fluxos; terminou com 21 `AUDIT_ERROR` por incompatibilidade do harness com imports atuais. Não houve chamadas externas nem gravações pelo harness.
- Smoke tests remotos: homepage HTTPS 200, `/api/health` 200, redirect HTTP→HTTPS 301, `nginx -t` aprovado e serviços BarberPro/Nginx/PostgreSQL/Certbot timer ativos.

## Bloqueios antes de atender clientes

1. **Incidente na VPS:** `genioplay-redis-1` tinha um minerador dentro do container, consumindo até 188% de CPU e 2,3 GiB de RAM. O Redis já não respondia. O container foi parado, o reinício automático desativado, e o Compose foi ajustado para bind local; container, volume e cópia do Compose original foram preservados. A causa inicial e possível persistência no host ainda precisam de investigação. Por isso esta publicação é apenas preview; não inserir dados reais de clientes ou operação até concluir a auditoria do host.
2. **Outro Redis exposto:** `richards-redis-1` respondia sem autenticação e era publicado publicamente na porta 6380. Foi limitado a `127.0.0.1`; o mesmo volume foi preservado, o `PING` local continuou funcionando e a aplicação Richards permaneceu online. Nginx e PostgreSQL continuaram ativos, os hashes dos sites existentes permaneceram iguais e as respostas locais de Richards foram HTTP 301/HTTPS 200.
3. **Configuração de lançamento:** domínio, `APP_URL`, DNS e HTTPS estão prontos para o preview. Ainda faltam credenciais SMTP e credenciais/endpoint do provedor WhatsApp. O envio real de e-mail/WhatsApp não foi verificado.
4. **Cobertura funcional:** falta concluir identificação e sessão verificada do cliente para consultar histórico; consentimento explícito de WhatsApp ainda não tem fluxo de captura; calendários/folgas e permissões detalhadas dos papéis precisam de homologação e conclusão conforme o plano.
5. **Preparação operacional:** não foi testada restauração de backup nem configurado monitoramento/alertas. O banco BarberPro é novo e vazio; nenhum banco de outros projetos foi migrado ou alterado. O smoke test público foi feito somente para homepage e saúde.
6. **Acesso administrativo:** a senha root de SSH foi compartilhada na conversa; troque-a antes de novos acessos.

## Próximas etapas seguras

1. Trocar a senha root e investigar a origem do minerador e persistência no host; manter parado o container antigo até reconstruí-lo de uma imagem confiável.
2. Corrigir o harness de auditoria e concluir os itens funcionais pendentes; testar restauração e monitoramento antes de aceitar dados reais.
3. Configurar SMTP e WhatsApp quando disponíveis e testar os fluxos correspondentes.
4. Criar o proprietário inicial por procedimento seguro, sem manter a senha de bootstrap no ambiente, quando o usuário estiver pronto para administrar o sistema.

O preview está publicado em https://barberpro.genioplay.com.br. Ele não deve ser tratado como produção para operação comercial até as pendências acima serem concluídas. A contenção descrita em `ANALISE-VPS.md` e a publicação foram limitadas aos recursos explicitamente citados; os outros projetos não foram reiniciados. O preview não contém conta de proprietário nem dados de clientes.
