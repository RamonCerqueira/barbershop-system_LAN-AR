#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=/opt/barberpro
backup_root=$root/shared/backups/scheduled
runtime=/opt/node-v22.23.4-linux-x64/bin
install -d -m 0700 "$backup_root"
exec 9>"$backup_root/.lock"
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
work="$backup_root/.pending-$stamp"
final="$backup_root/$stamp"
clone="barberpro_restore_$(date -u +%Y%m%d_%H%M%S)"
[[ "$clone" =~ ^barberpro_restore_[0-9_]+$ ]]
cleanup() { runuser -u postgres -- dropdb --if-exists "$clone" >/dev/null 2>&1 || true; }
trap cleanup EXIT
mkdir -m 0700 "$work"
database=$(runuser -u barberpro -- "$runtime/node" --env-file="$root/shared/app.env" -e 'process.stdout.write(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)))')
[[ "$database" =~ ^[a-zA-Z0-9_]+$ ]]
runuser -u postgres -- pg_dump -Fc --no-owner --no-acl "$database" > "$work/database.dump"
tar -C "$root/shared" -czf "$work/uploads.tar.gz" uploads
install -m 0600 "$root/shared/app.env" "$work/app.env"
(cd "$work" && sha256sum database.dump uploads.tar.gz app.env > SHA256SUMS && sha256sum -c SHA256SUMS)
runuser -u postgres -- createdb --owner=app_barberpro "$clone"
runuser -u postgres -- pg_restore --exit-on-error --no-owner --no-acl --role=app_barberpro -d "$clone" < "$work/database.dump"
runuser -u postgres -- psql -d "$clone" -v ON_ERROR_STOP=1 -Atqc 'SET ROLE app_barberpro; SELECT count(*) FROM companies; SELECT count(*) FROM appointments;' > "$work/restore-counts.txt"
mkdir "$work/restored-uploads"
tar -xzf "$work/uploads.tar.gz" -C "$work/restored-uploads"
tar -dzf "$work/uploads.tar.gz" -C "$work/restored-uploads"
rm -r -- "$work/restored-uploads"
printf 'RESTORE_OK %s\n' "$stamp" > "$work/VERIFIED"
readlink -f "$root/current" > "$work/release.txt"
mv "$work" "$final"
# Only completed, verified snapshots older than 14 days are eligible.
while IFS= read -r candidate; do
  [[ "$candidate" =~ ^/opt/barberpro/shared/backups/scheduled/[0-9]{8}T[0-9]{6}Z$ && -f "$candidate/VERIFIED" ]] && rm -r -- "$candidate"
done < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime +14)
printf 'BACKUP_RESTORE_OK %s\n' "$final"
