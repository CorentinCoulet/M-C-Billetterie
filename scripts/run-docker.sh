#!/usr/bin/env bash

set -euo pipefail

# Simple unified launcher for Docker stacks (dev/prod) with optional monitoring
# Usage:
#   scripts/run-docker.sh <dev|prod> [action] [--build] [--monitoring]
#
# Actions supportées:
#   up | down | restart | logs | status | down-v | clean | rebuild | pull | prune | doctor | seed | migrate | init-admin | migrate-dev

ACTION="up"
ENVIRONMENT=""
WITH_MONITORING=false
BUILD=false

die() { echo "[run-docker] $*" >&2; exit 1; }

if [[ ${#} -lt 1 ]]; then
  die "Usage: scripts/run-docker.sh <dev|prod> [action] [--build] [--monitoring]"
fi

ENVIRONMENT="$1"; shift || true

case "${ENVIRONMENT}" in
  dev|prod) ;;
  *) die "Environment must be 'dev' or 'prod'" ;;
esac

if [[ ${#} -ge 1 ]]; then
  case "${1:-}" in
    up|down|restart|logs|status|down-v|clean|rebuild|pull|prune|doctor|seed|migrate|init-admin|migrate-dev) ACTION="$1"; shift || true ;;
  esac
fi

while [[ ${#} -gt 0 ]]; do
  case "$1" in
    --monitoring) WITH_MONITORING=true; shift ;;
    --build) BUILD=true; shift ;;
    *) die "Unknown option: $1" ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Select env file and compose files
if [[ "$ENVIRONMENT" == "dev" ]]; then
  ENV_FILE=".env.dev"
  COMPOSE_FILES=("-f" "docker-compose.dev.yml")
  export COMPOSE_ENV=dev
  export COMPOSE_NETWORK=billetterie-dev-network
else
  ENV_FILE=".env.prod"
  COMPOSE_FILES=("-f" "docker-compose.yml" "-f" "docker-compose.prod.yml")
  export COMPOSE_ENV=prod
  export COMPOSE_NETWORK=billetterie-network
fi

if [[ "$WITH_MONITORING" == true ]]; then
  COMPOSE_FILES+=("-f" "docker-compose.monitoring.yml")
fi

[[ -f "$ENV_FILE" ]] || die "Fichier d'environnement manquant: $ENV_FILE"

CMD=(docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE")

case "$ACTION" in
  up)
    if [[ "$BUILD" == true ]]; then
      "${CMD[@]}" build
    fi
    "${CMD[@]}" up -d
    ;;
  down)
    "${CMD[@]}" down
    ;;
  down-v)
    "${CMD[@]}" down -v --remove-orphans
    ;;
  clean)
    "${CMD[@]}" down -v --remove-orphans || true
    docker system prune -f || true
    ;;
  restart)
    "${CMD[@]}" down
    if [[ "$BUILD" == true ]]; then
      "${CMD[@]}" build
    fi
    "${CMD[@]}" up -d
    ;;
  rebuild)
    "${CMD[@]}" down || true
    "${CMD[@]}" build
    "${CMD[@]}" up -d
    ;;
  pull)
    "${CMD[@]}" pull
    ;;
  prune)
    docker system prune -f
    ;;
  doctor)
    # Valide la configuration docker compose résultante
    "${CMD[@]}" config
    ;;
  seed)
    if [[ "$ENVIRONMENT" != "dev" ]]; then
      die "L'action 'seed' est disponible uniquement en environnement dev"
    fi
    # Exécute le seed via le service utilitaire seed-dev
    docker compose -f docker-compose.dev.yml --env-file .env.dev run --rm seed-dev
    ;;
  migrate)
    if [[ "$ENVIRONMENT" != "prod" ]]; then
      die "L'action 'migrate' est prévue pour la production"
    fi
    # Exécute les migrations Prisma via le service utilitaire 'migrate'
    "${CMD[@]}" run --rm migrate
    ;;
  migrate-dev)
    if [[ "$ENVIRONMENT" != "dev" ]]; then
      die "L'action 'migrate-dev' est disponible uniquement en environnement dev"
    fi
    docker compose -f docker-compose.dev.yml --env-file .env.dev run --rm migrate-dev
    ;;
  init-admin)
    if [[ "$ENVIRONMENT" != "prod" ]]; then
      die "L'action 'init-admin' est prévue pour la production"
    fi
    # Initialise le compte admin sécurisé en production
    "${CMD[@]}" run --rm init-admin
    ;;
  logs)
    "${CMD[@]}" logs -f
    ;;
  status)
    "${CMD[@]}" ps
    ;;
  *) die "Unknown action: $ACTION" ;;
esac

echo "[run-docker] Done ($ENVIRONMENT, monitoring=${WITH_MONITORING}, action=${ACTION})."
