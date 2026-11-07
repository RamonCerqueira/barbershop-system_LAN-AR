#!/usr/bin/env bash
set -Eeuo pipefail

root=/opt/barberpro
repo="$root/repository"
app_user=barberpro
runtime=/opt/node-v22.23.4-linux-x64/bin
service=barberpro
branch=main
unit_file="/etc/systemd/system/$service.service"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
switched=0
unit_changed=0
old_release=
unit_backup=
release=

fail() { printf 'BarberPro deploy: %s\n' "$*" >&2; exit 1; }

[[ $(id -u) -eq 0 ]] || fail 'execute como root.'
[[ -d "$repo/.git" ]] || fail "clone Git não encontrado em $repo."
[[ -f "$root/shared/app.env" ]] || fail 'arquivo de ambiente compartilhado ausente.'
[[ -x "$runtime/node" ]] || fail "runtime Node ausente em $runtime."
[[ -f "$unit_file" ]] || fail "unidade systemd não encontrada: $unit_file."

old_release=$(readlink -f "$root/current" || true)
[[ -n "$old_release" && -d "$old_release" ]] || fail 'release atual não encontrada para rollback.'

as_app() {
  runuser -u "$app_user" -- env HOME="$root" PATH="$runtime:/usr/bin:/bin" "$@"
}

rollback() {
  code=$?
  trap - ERR
  if [[ "$switched" == 1 ]]; then
    printf 'Falha após a troca; voltando para %s...\n' "$old_release" >&2
    rollback_link="$root/.current.rollback.$stamp"
    ln -s "$old_release" "$rollback_link"
    mv -Tf "$rollback_link" "$root/current"
  fi
  if [[ "$unit_changed" == 1 ]]; then
    cp -a "$unit_backup" "$unit_file"
    systemctl daemon-reload
  fi
  if [[ "$switched" == 1 ]]; then systemctl restart "$service" || true; fi
  exit "$code"
}

trap 'rollback' ERR

printf 'Atualizando clone Git (%s)...\n' "$branch"
as_app git -C "$repo" fetch --prune origin "$branch"
as_app git -C "$repo" pull --ff-only origin "$branch"
commit=$(as_app git -C "$repo" rev-parse HEAD)
release="$root/releases/${stamp}-${commit:0:8}"
mkdir -m 0750 "$release"
chown "$app_user:$app_user" "$release"

as_app bash -c "git -C '$repo' archive '$commit' src prisma public scripts package.json package-lock.json next.config.ts postcss.config.mjs eslint.config.mjs tsconfig.json | tar -x -C '$release'"
ln -s "$root/shared/app.env" "$release/.env"
chown -h "$app_user:$app_user" "$release/.env"

printf 'Instalando dependências travadas pelo lockfile...\n'
as_app bash -c "cd '$release' && npm ci --include=dev --ignore-scripts --no-audit --no-fund"

old_engine="$old_release/node_modules/@prisma/engines"
new_engine="$release/node_modules/@prisma/engines"
[[ -x "$old_engine/schema-engine-debian-openssl-3.0.x" && -f "$old_engine/libquery_engine-debian-openssl-3.0.x.so.node" ]] || fail 'engines Prisma da release atual estão ausentes.'
old_engine_version=$("$runtime/node" -p "require('$old_engine/package.json').version")
new_engine_version=$("$runtime/node" -p "require('$new_engine/package.json').version")
[[ "$old_engine_version" == "$new_engine_version" ]] || fail "versão do Prisma mudou ($old_engine_version → $new_engine_version); instale os engines Linux correspondentes antes do deploy."
cp -p "$old_engine/schema-engine-debian-openssl-3.0.x" "$old_engine/libquery_engine-debian-openssl-3.0.x.so.node" "$new_engine/"
chown "$app_user:$app_user" "$new_engine/schema-engine-debian-openssl-3.0.x" "$new_engine/libquery_engine-debian-openssl-3.0.x.so.node"

printf 'Validando ambiente e gerando Prisma Client...\n'
as_app bash -c "cd '$release' && NODE_ENV=production node scripts/check-env.cjs && node node_modules/prisma/build/index.js generate"
printf 'Compilando release...\n'
as_app bash -c "cd '$release' && NODE_ENV=production npm run build"

backup_dir="$root/shared/backups"
install -d -m 0700 "$backup_dir"
database_name=$(as_app bash -c 'set -a; . /opt/barberpro/shared/app.env; set +a; node -e "process.stdout.write(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)))"')
[[ -n "$database_name" && "$database_name" != *'/'* ]] || fail 'nome do banco inválido em DATABASE_URL.'
db_backup="$backup_dir/barberpro_predeploy_${stamp}.dump"
printf 'Salvando backup do banco (%s)...\n' "$database_name"
runuser -u postgres -- pg_dump -Fc --no-acl --no-owner "$database_name" > "$db_backup"
chmod 0600 "$db_backup"
sha256sum "$db_backup"

printf 'Aplicando migrations versionadas...\n'
as_app bash -c "cd '$release' && NODE_ENV=production node node_modules/prisma/build/index.js migrate deploy"

unit_backup="$backup_dir/barberpro.service.predeploy_${stamp}"
cp -a "$unit_file" "$unit_backup"
unit_changed=1
sed -E -i "s#^ReadWritePaths=/opt/barberpro/shared /opt/barberpro/releases/[^ ]+/.next/cache\$#ReadWritePaths=/opt/barberpro/shared $release/.next/cache#" "$unit_file"
if ! grep -Fqx "ReadWritePaths=/opt/barberpro/shared $release/.next/cache" "$unit_file"; then
  cp -a "$unit_backup" "$unit_file"
  unit_changed=0
  fail 'não foi possível atualizar o caminho de cache no systemd.'
fi
systemctl daemon-reload

next_link="$root/.current.next.$stamp"
ln -s "$release" "$next_link"
mv -Tf "$next_link" "$root/current"
switched=1
systemctl restart "$service"
systemctl is-active --quiet "$service"
healthy=0
for attempt in {1..30}; do
  health_response=$(curl -fsS --max-time 5 http://127.0.0.1:3214/api/health 2>/dev/null || true)
  if [[ "$health_response" == *'"status":"ok"'* ]]; then healthy=1; break; fi
  sleep 2
done
[[ "$healthy" == 1 ]] || { printf 'Health check não ficou saudável em 60 segundos.\n' >&2; false; }
switched=0
trap - ERR

printf 'BarberPro ativo: %s (%s)\n' "$release" "$commit"
printf 'Rollback preservado: %s\n' "$old_release"
