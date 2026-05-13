#!/usr/bin/env bash
# Start Postgres (Docker), backend (uvicorn on LAN), and Expo (Metro on LAN).
# Run from anywhere: bash scripts/dev-stack.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER_NAME:-bracket-dev-postgres}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5432}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not found in PATH." >&2
  exit 1
fi

start_postgres() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
    echo "Starting existing container: $POSTGRES_CONTAINER"
    docker start "$POSTGRES_CONTAINER" >/dev/null
  else
    echo "Creating Postgres: $POSTGRES_CONTAINER (port ${POSTGRES_HOST_PORT}:5432)"
    docker run -d \
      --name "$POSTGRES_CONTAINER" \
      -e POSTGRES_DB=bracket_dev \
      -e POSTGRES_USER=bracket_dev \
      -e POSTGRES_PASSWORD=bracket_dev \
      -p "${POSTGRES_HOST_PORT}:5432" \
      postgres:16-alpine
  fi
  echo "Waiting for Postgres..."
  for _ in $(seq 1 40); do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U bracket_dev -d bracket_dev >/dev/null 2>&1; then
      echo "Postgres is ready."
      return 0
    fi
    sleep 1
  done
  echo "Postgres did not become ready in time." >&2
  exit 1
}

ensure_dev_env() {
  if [ ! -f "$REPO_ROOT/backend/dev.env" ]; then
    echo "Creating backend/dev.env from dev.env.sample"
    cp "$REPO_ROOT/backend/dev.env.sample" "$REPO_ROOT/backend/dev.env"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s|@localhost:5432|@localhost:${POSTGRES_HOST_PORT}|" "$REPO_ROOT/backend/dev.env"
    else
      sed -i "s|@localhost:5432|@localhost:${POSTGRES_HOST_PORT}|" "$REPO_ROOT/backend/dev.env"
    fi
  fi
}

start_postgres
ensure_dev_env

if [ ! -x "$REPO_ROOT/backend/.venv/bin/uvicorn" ]; then
  echo "Missing backend/.venv. Create it from repo root, for example:" >&2
  echo "  cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -e ." >&2
  exit 1
fi

BACKEND_PID=""
cleanup() {
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://0.0.0.0:8400 (loads backend/dev.env via DevelopmentConfig)"
(
  cd "$REPO_ROOT/backend"
  exec .venv/bin/uvicorn bracket.app:app --host 0.0.0.0 --port 8400 --reload
) &
BACKEND_PID=$!

cd "$REPO_ROOT/mobile-app"
if [ ! -d node_modules ]; then
  npm install
fi

echo "Starting Expo (LAN). Press Ctrl+C to stop Expo and backend."
exec npx expo start --host lan --port 8081
