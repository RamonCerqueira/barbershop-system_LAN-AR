# Operação e relacionamento

## Administração

Em **Operação & Clientes** (`/dashboard/operacao`), configure lembretes, a antecedência em horas e a política de sinal. O cliente também precisa autorizar e-mail/WhatsApp em `/cliente/avisos`. Sem provedor configurado, a central do portal continua funcionando; o sistema não simula entrega externa. Os envios por e-mail ambíguos ou com erro não são repetidos automaticamente para evitar duplicidade.

A regra automática de sinal considera as faltas do cadastro do cliente dentro da própria barbearia. Não vincula contas por telefone. “Sempre exigir sinal” complementa essa regra. O valor é um percentual do serviço, registrado na reserva. O administrador confere o PIX manualmente; informar pagamento pelo portal não confirma nem cria receita automaticamente. Faltas só podem ser registradas após o horário do atendimento.

Em **Bloqueios & Folgas**, selecione profissional ou todos e um intervalo de datas. Para fechar o dia inteiro, use 00:00–23:59. Reservas existentes que cruzam o bloqueio impedem a operação; devem ser remarcadas ou canceladas antes. Bloqueios, almoço e horário de funcionamento são verificados no servidor, nas reservas e remarcações.

Fotos dos resultados são enviadas em Operação & Clientes, escolhendo um atendimento concluído. Limite de quatro imagens de 2 MB, PNG/JPG/WEBP. Permanecem privadas; o titular autoriza cada publicação no histórico e pode revogá-la. O endpoint não mantém cache público após consentimento. Os arquivos ficam em `UPLOAD_DIR/cut-photos`, fora da pasta pública e persistentes entre releases.

## Lista de espera e lembretes

O cliente escolhe um horário ocupado na página da barbearia. A fila respeita a ordem de entrada por profissional/data/hora, sem agendamento automático. Um horário disponível gera aviso válido por 15 minutos. A vaga continua sujeita a concorrência e à validação normal na reserva; não é um bloqueio exclusivo. Após expirar, o próximo cliente é avisado. Solicitações limitadas a dez ativas por conta; podem ser removidas em `/cliente/avisos`.

O worker `scripts/processCustomerOperations.cjs` processa prazos de PIX, lista e avisos. O timer `barberpro-operations.timer` executa a cada minuto, sem sobrepor a própria unidade. A fila usa chaves de deduplicação e transações. A reserva é sempre validada novamente ao confirmar.

## Backups

`barberpro-backup.timer` executa diariamente às 05:00 UTC (02:00 de Brasília), com atraso aleatório de até dez minutos. `backup-vps.sh` cria dump PostgreSQL e arquivo de todas as imagens persistentes, calcula hashes, restaura o banco em base temporária isolada e extrai/confere o arquivo de imagens. Só então grava `VERIFIED` e publica a pasta final. Uma falha deixa a pasta `.pending-*` para diagnóstico e faz a unidade falhar; as cópias verificadas são preservadas.

Destino privado: `/opt/barberpro/shared/backups/scheduled/YYYYMMDDTHHMMSSZ`. Inclui uma cópia privada do ambiente `app.env`, acessível somente ao root; nunca publicar ou anexar esse arquivo. Retenção: pelo menos 14 dias, removendo exclusivamente pastas verificadas nesse diretório. O teste de restauração nunca escreve no banco de produção. A cópia é local à VPS; cópia externa requer um destino adicional e ainda não está configurada.

Na instalação/atualização da rotina, copiar `deploy/vps/backup-vps.sh` como root para `/opt/barberpro/shared/backups/bin/backup-vps.sh`, com proprietário root e modo 0700. A unidade privilegiada usa essa cópia privada; a restauração de teste usa a role limitada `app_barberpro`.

Para conferir: `systemctl status barberpro-backup.service`, `journalctl -u barberpro-backup.service`, `systemctl list-timers barberpro-backup.timer barberpro-operations.timer`. Para executar e verificar uma cópia manual: `systemctl start barberpro-backup.service`. Para recuperação real, preservar a versão atual, conferir `SHA256SUMS`, restaurar em uma base nova e extrair imagens em diretório novo, validar e só então apontar a aplicação para os dados restaurados. Não sobrescrever o banco ativo para testar.
