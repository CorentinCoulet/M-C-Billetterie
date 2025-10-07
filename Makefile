# Makefile to simplify Ticketing project commands
.PHONY: help install dev build test docker clean

# Variables
COMPOSE_DEV := docker-compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD := docker-compose -f docker-compose.yml -f docker-compose.prod.yml
COMPOSE_MONITORING := docker-compose -f docker-compose.monitoring.yml

# Help
help: ## Display this help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install dependencies
	yarn install

# Development
dev: ## Start development environment
	yarn dev

dev-docker: ## Start development environment with Docker
	$(COMPOSE_DEV) up -d
	@echo "🚀 Development environment started on http://localhost:3000"

# Build
build: ## Build the application
	yarn build

build-docker: ## Build Docker image
	docker build -t billetterie-app -f docker/Dockerfile.next .

# Tests
test: ## Run tests
	yarn test

test-coverage: ## Run tests with coverage
	yarn test:coverage

# Database
db-setup: ## Setup database
	yarn db:generate
	yarn db:migrate

db-seed: ## Seed database
	yarn db:seed

db-reset: ## Reset database
	yarn db:reset

# Docker - Development
docker-dev-up: ## Start all services in development mode
	$(COMPOSE_DEV) up -d

docker-dev-down: ## Stop development services
	$(COMPOSE_DEV) down

docker-dev-logs: ## Display development services logs
	$(COMPOSE_DEV) logs -f

# Docker - Production
docker-prod-up: ## Start all services in production mode
	$(COMPOSE_PROD) up -d

docker-prod-down: ## Stop production services
	$(COMPOSE_PROD) down

docker-prod-logs: ## Display production services logs
	$(COMPOSE_PROD) logs -f

# Monitoring
monitoring-up: ## Start monitoring (Prometheus, Grafana)
	$(COMPOSE_MONITORING) up -d
	@echo "📊 Monitoring started:"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3001"

monitoring-down: ## Stop monitoring
	$(COMPOSE_MONITORING) down

# Cleanup
clean: ## Clean Docker containers and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Clean everything (containers, volumes, images, yarn cache)
	docker-compose down -v --remove-orphans
	docker system prune -af
	yarn cache clean --force
	rm -rf node_modules .next

# Linting and formatting
lint: ## Run linting
	yarn lint

lint-fix: ## Automatically fix linting errors
	yarn lint:fix

# Type checking
type-check: ## Check TypeScript types
	yarn type-check

# Production
prod-setup: ## Setup production environment
	yarn prod:setup

prod-deploy: ## Deploy to production
	yarn prod:deploy

# Backup
backup: ## Create database backup
	./scripts/backup.sh

# Utilities
logs: ## Display application logs
	docker-compose logs -f web

status: ## Display services status
	docker-compose ps

# Compound commands
full-setup: install db-setup ## Full installation (dependencies + DB)
	@echo "✅ Full installation completed"

dev-fresh: clean-all install build dev ## Clean restart in development

prod-fresh: clean-all install build docker-prod-up ## Clean start in production
