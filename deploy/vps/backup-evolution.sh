#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) -eq 0 ]] || exit 1
target=/opt/barberpro/shared/evolution
destination=${1:?Pass the private backup destination}
[[ "$destination" == /opt/barberpro/shared/backups/scheduled/.pending-* ]] || exit 1
[[ -d "$destination" && -f "$target/compose.yaml" ]] || exit 1
cd "$target"
paused=0
cleanup() { if [[ "$paused" == 1 ]]; then docker compose unpause api >/dev/null || true; fi; docker compose exec -T db dropdb -U evolution --if-exists evolution_backup_verify >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker compose pause api >/dev/null
paused=1
docker compose exec -T db pg_dump -U evolution -Fc --no-owner --no-acl evolution > "$destination/evolution.dump"
tar -czf "$destination/evolution-sessions.tar.gz" instances .env compose.yaml
docker compose unpause api >/dev/null
paused=0
docker compose exec -T db createdb -U evolution evolution_backup_verify
docker compose exec -T db pg_restore -U evolution --exit-on-error --no-owner --no-acl -d evolution_backup_verify < "$destination/evolution.dump"
docker compose exec -T db dropdb -U evolution evolution_backup_verify
sha256sum "$destination/evolution.dump" "$destination/evolution-sessions.tar.gz" > "$destination/EVOLUTION_SHA256SUMS"
printf 'EVOLUTION_RESTORE_OK\n' > "$destination/EVOLUTION_VERIFIED"
