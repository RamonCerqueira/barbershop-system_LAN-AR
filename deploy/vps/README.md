# Implantação futura — ambiente compartilhado

**Estado: preview publicado em `https://barberpro.genioplay.com.br`.** Ver [análise da VPS](../../docs/producao/ANALISE-VPS.md) e [status](../../docs/producao/STATUS-IMPLEMENTACAO.md). O serviço, role, banco e site Nginx próprios estão ativos. Não usar dados reais até a auditoria do host, restauração de backup e homologação funcional serem concluídas. O contêiner suspeito de GenioPlay permanece parado; outro Redis sem autenticação foi limitado a loopback.

Padrão observado e adotado: Nginx do host, PostgreSQL 17 local, usuário e runtime por aplicação, systemd e releases com symlink. Não instalar Docker ou PostgreSQL adicional, nem alterar o Node global ou o PM2 dos demais projetos.

Recursos criados para o preview:

- Usuário/grupo `barberpro` sem sudo/shell; release `/opt/barberpro/releases/20261031-preview`, symlink `/opt/barberpro/current`, dados persistentes em `/opt/barberpro/shared`.
- Node 22 existente na VPS; dependências instaladas com lockfile e build Next.js feito em Linux.
- Arquivo `/opt/barberpro/shared/app.env`, modo 0600 e proprietário `barberpro`; contém segredos individuais. Nunca versionar nem revelar.
- Banco `barberpro_prod` e role `app_barberpro` sem SUPERUSER/CREATEDB/CREATEROLE; conexão local limitada a cinco conexões.
- Serviço `barberpro.service` em `127.0.0.1:3214`, limites 512 MiB/75% CPU/128 tarefas e sandbox do systemd.
- Uploads persistentes em `/opt/barberpro/shared/uploads`.
- Site Nginx exclusivo para `barberpro.genioplay.com.br`; HTTPS Let's Encrypt ativo e renovação automática configurada.

Sequência de implantação após liberação:

1. Revalidar saúde/segurança da VPS, portas, espaço, memória e estado dos projetos; capturar hashes dos sites existentes.
2. Definir domínio/DNS e origem APP_URL, escopo do piloto e migração ou banco vazio.
3. Criar somente usuário, diretórios, role e banco do BarberPro. Não reutilizar credenciais de outra aplicação.
4. Fazer backup do banco de destino se já possuir dados. Validar migração e restauração em cópia descartável antes do deploy.
5. Publicar release Linux validada, instalar dependências do projeto com lockfile, gerar Prisma e executar migrations versionadas apenas no banco BarberPro.
6. Validar ambiente por `scripts/check-env.cjs`; bootstrap do proprietário por CLI com senha individual, sem redefinir conta existente.
7. Instalar/iniciar somente a unidade BarberPro. Testar em loopback antes de apontar Nginx.
8. Adicionar apenas o novo arquivo de site e certificado exclusivo. Testar `nginx -t` antes de eventual reload compartilhado; preservar os outros arquivos.
9. Para mudanças futuras, executar smoke tests do domínio e dos domínios existentes. Comparar hashes e serviços capturados.
10. Criar backup/retention e testar restauração; registrar revisão, migrations, responsáveis e rollback. Habilitar worker somente após configurar e testar o provedor.

Rollback: preservar release anterior e trocar apenas o symlink/serviço BarberPro. Migrations destrutivas ou restauração de banco exigem plano próprio; não reverter schema automaticamente. Nunca usar `pm2 restart all`, `docker compose down` de diretório alheio ou restart do cluster PostgreSQL.

O preview está ativo. Não há proprietário bootstrapado, credenciais SMTP/WhatsApp ou dados de clientes; não usar como operação comercial. Antes de abrir para clientes, completar as pendências do status de produção e corrigir o harness que atualmente falha em 21 imports.
