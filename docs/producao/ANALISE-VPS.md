# Análise e contenção da VPS

Inspeção inicial em 30/10/2026; contenção e publicação isolada de preview em 31/10/2026. Destino: `153.75.244.238`. Credenciais não são registradas neste documento.

## Resultado

**Preview do BarberPro publicado; produção comercial ainda pendente.** Em 31/10 foi confirmado um minerador em `genioplay-redis-1` e um segundo Redis sem autenticação publicado publicamente. O primeiro container foi parado e teve reinício automático desativado; o segundo foi limitado a loopback. Os dados dos volumes foram preservados. O host não foi comprovado como comprometido, e a causa inicial ainda precisa de investigação.

## Estrutura observada

- Ubuntu 24.04.5 LTS, kernel 6.8, cerca de 5,9 GiB RAM e 4,5 GiB swap.
- Na amostra inicial: cerca de 4,8 GiB usados, 1,1 GiB disponíveis e 2,1 GiB de swap utilizados; filesystem raiz com 67 GiB disponíveis.
- Nginx atende 80/443, com sites separados em `sites-available`/`sites-enabled` e certificados Let's Encrypt.
- Existem aplicações antigas em PM2/root e Redis em Docker. Os serviços mais recentes usam isolamento melhor: usuário próprio, systemd, runtime por projeto e diretórios de releases.
- PostgreSQL 17.11, escutando apenas em localhost:5432; 100 conexões máximas. Os projetos têm bancos e roles próprias sem superuser/createdb/createrole.
- Node global 20.20.2. O projeto local usa Node 22; o preview usa o runtime isolado já instalado em `/opt/node-v22.23.4-linux-x64`, sem alterar Node global.
- Portas 3000/3001 e 3210–3213 já estavam ocupadas. O BarberPro usa **3214 somente em loopback**.

## Padrão a seguir

O projeto Pirambeira usa:

- `/opt/pirambeira/releases/<revisão>` e symlink `current`;
- configuração persistente em `shared`, sem sobrepor arquivos de outros projetos;
- executável Node em `/opt/pirambeira/runtime/bin/node`;
- usuário e grupo próprios;
- unidades systemd próprias, com limites de memória (512/768 MiB na amostra);
- proxy Nginx para `127.0.0.1`, domínio exclusivo e PostgreSQL com role exclusiva.

O preview segue esse padrão em `/opt/barberpro`, usuário `barberpro`, banco `barberpro_prod`, role `app_barberpro`, porta interna exclusiva e site próprio.

Não usar `pm2 restart all`, não atualizar runtimes globais, não reiniciar o cluster PostgreSQL, não substituir nginx.conf, não editar os sites/containers alheios e não reutilizar credenciais ou bancos de outro projeto. Compilar em ambiente Linux de CI, evitando carga de build na VPS compartilhada.

## Achado que bloqueia a publicação

Na amostra de 30/10/2026, aproximadamente 17:37 UTC (14:37 Brasília):

| Evidência | Valor |
|---|---|
| Processo | PID 1411680, nome `.sys`, executado como `dnsmasq` (UID do processo no host) |
| Executável e cwd | `/tmp/.sys`, `/tmp` |
| Início informado pelo SO | 30/10/2026 17:23:45 UTC |
| Consumo amostrado antes da contenção | 183%–188% CPU e 39,5% de RAM, cerca de 2,3 GiB |
| Cgroup | `docker-af2767f260b1ddbfa8114507211a6f1346c91760522ea1481ca2cd3701eda7dd.scope` |
| Container correspondente | `genioplay-redis-1`, imagem declarada `redis:7-alpine` |
| Processo pai | `sh`/BusyBox, PID 1411672 |
| Strings encontradas por leitura do binário | `cryptonight-monerov7`, `cryptonight-monerov8`, `randomx/0`, `randomx/test` |
| SHA-256 do executável | `fd11982f252c060a1372e81d5be57589647052b56281a5c54975ca22164f7726` |

Esses sinais são incompatíveis com a função normal de um Redis e sustentam fortemente a conclusão de mineração dentro do container. O binário não foi executado nem enviado a terceiros. Ao retomar a inspeção, o container não continha processo `redis-server`; um `PING` local recebeu conexão recusada. O Redis já estava indisponível antes de qualquer contenção.

O container suspeito publicava a porta 6379 em todas as interfaces. A contenção foi:

1. Pausar e depois parar somente `genioplay-redis-1`. Ele ficou com estado `exited` e código 137; o PID do minerador deixou de existir. O volume `/data` não foi removido e ocupava 4 KB.
2. Definir `restart=no` no container para impedir reinício automático e salvar cópia do Compose original em `/root/genioplay/docker-compose.yml.codex-before-redis-containment-20261031.bak`.
3. Alterar somente o Compose de GenioPlay para não reiniciar automaticamente e publicar Redis apenas em `127.0.0.1:6379`. O container antigo permanece parado; não executar `docker start genioplay-redis-1`, pois sua configuração antiga ainda tem o bind público. Uma recuperação deve recriar o serviço a partir de imagem confiável, usando o Compose atualizado e preservando/verificando o volume.

Também foi encontrado `richards-redis-1` sem autenticação (`PING` retornou `PONG`), publicado em `0.0.0.0:6380`. Havia um cliente local e nenhum cliente externo conectado na amostra. Foi salva cópia do Compose original em `/root/Richards/docker-compose.yml.codex-before-redis-loopback-20261031.bak`; somente o bind foi alterado para `127.0.0.1:6380:6379`. O container foi recriado sem dependências, mantendo o mesmo volume; `PING` continuou respondendo e a porta ficou escutando somente em loopback.

O Redis `buscadortecnico-redis` já estava vinculado apenas a `127.0.0.1:6381` e não foi alterado. UFW estava inativo. Não foi feita alteração global de firewall.

## Nginx e estado dos demais projetos

`nginx -t` aprovou a sintaxe existente, mas emitiu avisos preexistentes de `server_name 153.75.244.238` duplicado em 80/443. Não corrigir isso junto com o BarberPro; usar domínio exclusivo e não cadastrar novamente o IP como nome do site.

Hashes de referência obtidos por leitura:

- `/etc/nginx/nginx.conf`: `48c6a4ec1e1fd28ccf968490f07e34a1d7f755793b2108a3ed8670b1ee2a0aa2`.
- Site `pirambeira.conf`: `0bffc38cf246dbb94f05fb3cc39bab73e0628ad674d641c6960089f1b93ea073`.
- Site `mgbp`: `ff55d9f8eebcfc36961895d5f1b7a4837763f79a0c71234ca8118e166841d809`.

Após a contenção, Nginx e PostgreSQL continuaram ativos. Os hashes de `/etc/nginx/nginx.conf`, `pirambeira.conf` e `mgbp` permaneceram iguais aos valores de referência acima. A memória disponível subiu de cerca de 1,2 GiB antes da contenção para 3,5 GiB depois; swap permaneceu em uso. Os outros containers listados continuaram ativos. Foi visto outro projeto com alterações recentes (`/var/www/mgbp`); não interferir em publicações simultâneas.

## Preview BarberPro (31/10/2026)

O usuário confirmou o domínio `barberpro.genioplay.com.br` e pediu publicação para visualizar a interface, deixando os demais serviços para depois. DNS A resolve para `153.75.244.238`; Certbot emitiu certificado individual Let's Encrypt válido até 29/01/2027 e configurou renovação automática. HTTP redireciona para HTTPS.

Foi criado somente o conjunto BarberPro: usuário de sistema `barberpro` sem shell, release em `/opt/barberpro/releases/20261031-preview`, symlink `/opt/barberpro/current`, uploads em `/opt/barberpro/shared/uploads`, ambiente `0600` em `/opt/barberpro/shared/app.env`, serviço `barberpro.service`, banco `barberpro_prod` e role `app_barberpro` sem SUPERUSER/CREATEDB/CREATEROLE. App escuta apenas em `127.0.0.1:3214`; o Nginx tem um site exclusivo para o subdomínio. Serviço limita memória a 512 MiB, CPU a 75% e tarefas a 128, e usa sandbox básico do systemd.

Antes de criar a role, foram salvos globals do PostgreSQL em `/var/backups/local-postgres/globals-pre-barberpro-20261031.sql`; nenhum banco existente foi alterado. As sete migrations versionadas foram aplicadas ao banco novo vazio. Não foi criado proprietário nem conta de barbearia. SMTP e WhatsApp não foram configurados.

Verificações: `nginx -t` aprovado; homepage e `/api/health` em HTTPS retornaram 200; HTTP retorna 301; aplicação, PostgreSQL, Nginx e timer do Certbot estão ativos. O app só publica a porta pelo Nginx; 3214 permanece loopback. Os hashes do `nginx.conf`, `pirambeira.conf` e site `mgbp` são idênticos aos valores de referência. Não foram reiniciados outros projetos.

Esta publicação é um preview para visualização, não autorização para operação com dados reais. A origem e eventual persistência do minerador no host não foram determinadas, a auditoria automatizada de fluxos não passou (21 erros do harness por imports incompatíveis) e a restauração de backup ainda não foi testada. A VPS também reporta atualizações de segurança pendentes e necessidade de reboot. Não foi feito upgrade/reboot para preservar a disponibilidade dos demais projetos.

## Pendências para produção operacional

1. Investigar a causa do minerador e verificar mecanismos de persistência/escopo do host; o achado no container não prova comprometimento do host inteiro.
2. Reconstruir e homologar o Redis de GenioPlay a partir de imagem confiável antes de reativá-lo; manter o volume e container antigo disponíveis para análise.
3. Trocar a senha root de SSH, que foi compartilhada na conversa; a credencial não foi gravada nos arquivos do projeto.
4. Corrigir a auditoria automatizada e concluir homologação funcional.
5. Revisar memória e conexões disponíveis; criar apenas recursos exclusivos do BarberPro e testar migrations, backup/restauração e smoke tests dos projetos existentes.

O preview do BarberPro está disponível em https://barberpro.genioplay.com.br. O usuário de sistema, banco, role, unidade systemd e site Nginx são isolados. Mantenha parado o contêiner suspeito de GenioPlay e não trate o preview como produção operacional até concluir a investigação de segurança do host e as pendências listadas.
