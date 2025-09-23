# Makefile pour simplifier les commandes du projet Billetterie
.PHONY: help install dev build test docker clean

# Variables
COMPOSE_DEV := docker-compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD := docker-compose -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_MONITORING := docker-compose -f docker-compose.monitoring.yml

# Aide
help: ## Affiche cette aide
	@echo "Commandes disponibles :"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Installe les dépendances
	npm install

# Développement
dev: ## Lance l'environnement de développement
	npm run dev

dev-docker: ## Lance l'environnement de développement avec Docker
	$(COMPOSE_DEV) up -d
	@echo "🚀 Environnement de développement lancé sur http://localhost:3000"

# Build
build: ## Build l'application
	npm run build

build-docker: ## Build l'image Docker
	docker build -t billetterie-app -f docker/Dockerfile.next .

# Tests
test: ## Lance les tests
	npm test

test-coverage: ## Lance les tests avec coverage
	npm run test:coverage

# Base de données
db-setup: ## Configure la base de données
	npm run db:generate
	npm run db:migrate

db-seed: ## Peuple la base de données
	npm run db:seed

db-reset: ## Remet à zéro la base de données
	npm run db:reset

# Docker - Développement
docker-dev-up: ## Lance tous les services en mode développement
	$(COMPOSE_DEV) up -d

docker-dev-down: ## Arrête les services de développement
	$(COMPOSE_DEV) down

docker-dev-logs: ## Affiche les logs des services de développement
	$(COMPOSE_DEV) logs -f

# Docker - Production
docker-prod-up: ## Lance tous les services en mode production
	$(COMPOSE_PROD) up -d

docker-prod-down: ## Arrête les services de production
	$(COMPOSE_PROD) down

docker-prod-logs: ## Affiche les logs des services de production
	$(COMPOSE_PROD) logs -f

# Monitoring
monitoring-up: ## Lance le monitoring (Prometheus, Grafana)
	$(COMPOSE_MONITORING) up -d
	@echo "📊 Monitoring lancé :"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3001"

monitoring-down: ## Arrête le monitoring
	$(COMPOSE_MONITORING) down

# Nettoyage
clean: ## Nettoie les containers et volumes Docker
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Nettoie tout (containers, volumes, images, cache npm)
	docker-compose down -v --remove-orphans
	docker system prune -af
	npm cache clean --force
	rm -rf node_modules .next

# Linting et formatting
lint: ## Lance le linting
	npm run lint

lint-fix: ## Corrige automatiquement les erreurs de linting
	npm run lint:fix

# Type checking
type-check: ## Vérifie les types TypeScript
	npm run type-check

# Production
prod-setup: ## Configure l'environnement de production
	npm run prod:setup

prod-deploy: ## Déploie en production
	npm run prod:deploy

# Sauvegarde
backup: ## Crée une sauvegarde de la base de données
	./scripts/backup.sh

# Utilitaires
logs: ## Affiche les logs de l'application
	docker-compose logs -f web

status: ## Affiche le statut des services
	docker-compose ps

# Commandes composées
full-setup: install db-setup ## Installation complète (dépendances + DB)
	@echo "✅ Installation complète terminée"

dev-fresh: clean-all install build dev ## Redémarrage propre en développement

prod-fresh: clean-all install build docker-prod-up ## Démarrage propre en production
