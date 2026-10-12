#!/usr/bin/env bash
# Prueba de aislamiento (RLS), cuatro ojos, inmutabilidad y bitácora contra un PostgreSQL local desechable.
set -eo pipefail
BIN=/usr/lib/postgresql/16/bin; D=$(mktemp -d); chmod 777 "$D"
run() { su postgres -c "$*"; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
P="$BIN/psql -h $D -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
run "$P -c 'create role authenticated nologin; create role app login;' postgres"
run "$P -c 'grant authenticated to app;' postgres"
run "$P -f $(dirname "$0")/../migrations/0001_core.sql postgres"
run "$P -c 'grant usage on schema public to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated; grant execute on all functions in schema public to authenticated;' postgres"
run "$P -f $(dirname "$0")/rls.sql postgres" 2>&1 | grep -E "NOTICE|ERROR|FALLA" | sed "s/^psql:[^ ]* //"
echo "RLS: todas las pruebas pasaron"
