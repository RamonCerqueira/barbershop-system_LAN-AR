#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) -eq 0 ]] || exit 1
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
root=/opt/barberpro
target="$root/shared/evolution"
install -d -m 0700 "$target" "$target/instances"
install -m 0600 "$script_dir/evolution-compose.yaml" "$target/compose.yaml"
python3 - <<'PY'
from pathlib import Path
import secrets
root=Path('/opt/barberpro/shared')
path=root/'evolution/.env'
app=root/'app.env'
if not path.exists():
    password=secrets.token_hex(32)
    key=secrets.token_hex(32)
    path.write_text('\n'.join([
      'POSTGRES_PASSWORD='+password,
      'AUTHENTICATION_API_KEY='+key,
      'AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=false',
      'SERVER_URL=http://127.0.0.1:8088',
      'SERVER_PORT=8080',
      'DATABASE_ENABLED=true',
      'DATABASE_PROVIDER=postgresql',
      'DATABASE_CONNECTION_URI=postgresql://evolution:'+password+'@db:5432/evolution?schema=public',
      'DATABASE_CONNECTION_CLIENT_NAME=barberpro_evolution',
      'DATABASE_SAVE_DATA_INSTANCE=true',
      'DATABASE_SAVE_DATA_NEW_MESSAGE=false',
      'DATABASE_SAVE_MESSAGE_UPDATE=false',
      'DATABASE_SAVE_DATA_CONTACTS=false',
      'DATABASE_SAVE_DATA_CHATS=false',
      'DATABASE_SAVE_DATA_LABELS=false',
      'DATABASE_SAVE_DATA_HISTORIC=false',
      'CACHE_REDIS_ENABLED=true',
      'CACHE_REDIS_URI=redis://redis:6379/0',
      'CACHE_REDIS_PREFIX_KEY=barberpro',
      'CACHE_REDIS_SAVE_INSTANCES=false',
      'CACHE_LOCAL_ENABLED=false',
      'DEL_INSTANCE=false',
      'LOG_LEVEL=ERROR,WARN',
      'LOG_BAILEYS=error',
      'WEBHOOK_GLOBAL_ENABLED=false',
      'TELEMETRY_ENABLED=false',
      'CONFIG_SESSION_PHONE_CLIENT=BarberPro',
      'CONFIG_SESSION_PHONE_NAME=Chrome',
    ])+'\n')
    path.chmod(0o600)
values=dict(line.split('=',1) for line in path.read_text().splitlines() if '=' in line and not line.startswith('#'))
existing=app.read_text()
newvalues={'EVOLUTION_API_URL':'http://127.0.0.1:8088','EVOLUTION_API_KEY':values['AUTHENTICATION_API_KEY'],'EVOLUTION_WEBHOOK_SECRET':secrets.token_hex(32)}
for name,value in newvalues.items():
    if not any(line.startswith(name+'=') for line in existing.splitlines()):
        existing+='\n'+name+'='+value+'\n'
app.write_text(existing)
PY
cd "$target"
docker compose pull
docker compose up -d --wait --wait-timeout 180
healthy=0
for attempt in {1..60}; do
  if curl -fsS --max-time 3 http://127.0.0.1:8088/ >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
[[ "$healthy" == 1 ]] || { printf 'Evolution health check failed.\n' >&2; exit 1; }
install -m 0700 "$script_dir/backup-evolution.sh" "$target/backup.sh"
printf 'Evolution API ready on loopback, with isolated database and cache.\n'
