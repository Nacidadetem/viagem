#!/usr/bin/env bash
# Roda as migrações + testes num Postgres local temporário (sem Supabase).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB="ignez_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/stub_supabase.sql"
for f in "$DIR"/../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/base.test.sql"
