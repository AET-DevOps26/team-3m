#!/bin/sh
# Idempotently creates or reconciles the dedicated news database role. This is
# run by the Compose init service and the Helm provisioning Job on every
# deployment, so existing volumes and password rotations are handled safely.
set -eu

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:?POSTGRES_DB is required}"
POSTGRES_USER="${POSTGRES_USER:?POSTGRES_USER is required}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
NEWS_DB="${NEWS_POSTGRES_DB:-news}"
NEWS_USER="${NEWS_POSTGRES_USER:-news}"
NEWS_PASSWORD="${NEWS_POSTGRES_PASSWORD:?NEWS_POSTGRES_PASSWORD is required}"
export PGPASSWORD="$POSTGRES_PASSWORD"

attempt=0
until pg_isready -q -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
        echo "PostgreSQL did not become ready for news database provisioning" >&2
        exit 1
    fi
    sleep 2
done

psql -v ON_ERROR_STOP=1 \
    --host "$POSTGRES_HOST" \
    --port "$POSTGRES_PORT" \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=news_user="$NEWS_USER" \
    --set=news_password="$NEWS_PASSWORD" \
    --set=news_db="$NEWS_DB" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN', :'news_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'news_user')
\gexec

SELECT format(
    'ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
    :'news_user', :'news_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'news_db', :'news_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'news_db')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'news_db', :'news_user')
\gexec
EOSQL
