#!/usr/bin/env bash
# Build and start production stack (Postgres in Docker + app).
# Run from your laptop after SSH is optional; typically run ON THE SERVER in the repo clone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f deploy/prod.env ]]; then
  echo "Missing deploy/prod.env"
  echo "  cp deploy/prod.env.example deploy/prod.env"
  echo "  Edit passwords and URLs, then run this script again."
  exit 1
fi

echo "Building images…"
docker compose -f docker-compose.prod.yml --env-file deploy/prod.env build

echo "Starting services…"
docker compose -f docker-compose.prod.yml --env-file deploy/prod.env up -d

echo "Done. App (HTTP): http://127.0.0.1:8400 — put Nginx/Caddy in front for HTTPS."
docker compose -f docker-compose.prod.yml --env-file deploy/prod.env ps
