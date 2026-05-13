#!/bin/bash
set -eo pipefail

POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-bracket-local-postgres}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16}"
POSTGRES_DB="${POSTGRES_DB:-bracket_dev}"
POSTGRES_USER="${POSTGRES_USER:-bracket_dev}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-bracket_dev}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKEND_PORT="${BACKEND_PORT:-8400}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
PG_DSN="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"

function ensure_docker_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required but was not found."
    exit 1
  fi

  local container_exists
  container_exists="$(docker ps -a --filter "name=^/${POSTGRES_CONTAINER_NAME}$" --format '{{.Names}}')"

  if [[ -z "${container_exists}" ]]; then
    echo "Creating local postgres container: ${POSTGRES_CONTAINER_NAME}"
    docker run -d \
      --name "${POSTGRES_CONTAINER_NAME}" \
      -e POSTGRES_DB="${POSTGRES_DB}" \
      -e POSTGRES_USER="${POSTGRES_USER}" \
      -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
      -p "${POSTGRES_PORT}:5432" \
      -v bracket_local_pg_data:/var/lib/postgresql \
      "${POSTGRES_IMAGE}" >/dev/null
  else
    local running
    running="$(docker inspect -f '{{.State.Running}}' "${POSTGRES_CONTAINER_NAME}")"
    if [[ "${running}" != "true" ]]; then
      echo "Starting existing postgres container: ${POSTGRES_CONTAINER_NAME}"
      docker start "${POSTGRES_CONTAINER_NAME}" >/dev/null
    fi
  fi

  echo "Waiting for postgres to become ready..."
  until docker exec "${POSTGRES_CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
    sleep 1
  done
}

function run_frontend() {
  cd frontend && \
    pnpm install --ignore-scripts --frozen-lockfile && \
    pnpm run dev --host localhost --port "${FRONTEND_PORT}"
}

function run_backend() {
  cd backend && \
    ENVIRONMENT=DEVELOPMENT \
    CORS_ORIGINS="http://localhost:${FRONTEND_PORT}" \
    PG_DSN="${PG_DSN}" \
    SERVE_FRONTEND=false \
    API_PREFIX='' \
    uv run uvicorn bracket.app:app \
      --host localhost \
      --port "${BACKEND_PORT}" \
      --reload
}

ensure_docker_postgres

(trap 'kill 0' SIGINT;
  run_frontend &
  run_backend
)
