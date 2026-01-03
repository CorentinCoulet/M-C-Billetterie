# 🎫 Plateforme de Billetterie

**Plateforme de billetterie moderne construite avec Next.js 15, TypeScript, Prisma et PostgreSQL**

[![Version](https://img.shields.io/badge/version-1.2.0-blue)](./docs/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.15-2D3748)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/tests-1277%20passing-success)](./docs/TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-80%25-success)](./coverage)
[![Security](https://img.shields.io/badge/security-A%2B-success)](./SECURITY.md)

## 📚 Documentation Complète

> **📖 Toute la documentation technique est organisée dans [`/docs`](./docs/)**

| Document | Description |
|----------|-------------|
| [**📋 Index Documentation**](./docs/README.md) | Index complet de toute la documentation |
| [**� Démarrage Rapide**](./docs/QUICK_START_GUIDE.md) | Guide de démarrage complet |
| [**🛠️ Guide des Outils**](./docs/TOOLS_GUIDE.md) | Outils de développement et monitoring |
| [**� Tests**](./docs/TESTING.md) | Guide complet des tests |
| [**🔒 Sécurité**](./SECURITY.md) | Politique de sécurité et reporting |

## ⚡ Démarrage Rapide

> **⚠️ IMPORTANT : Ce projet utilise YARN exclusivement !**  
> Ne pas utiliser `npm` - cela peut causer des conflits de dépendances.

```bash
# Cloner et installer
git clone <repo>
cd billetterie
yarn install

# Configuration
cp .env.example .env
# Modifiez .env avec vos paramètres

# Base de données
yarn db:migrate
yarn db:generate

# Démarrer avec Docker
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.prod.yml up -d

# Arrêter
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.prod.yml down

# Démarrer le développement (sans Docker)
yarn dev
```

## 📦 Gestionnaire de Paquets

**YARN UNIQUEMENT** - Ce projet est optimisé pour yarn.

```bash
# ✅ Commandes recommandées
yarn install      # Installer les dépendances
yarn dev         # Serveur de développement
yarn build       # Build de production
yarn add <pkg>   # Ajouter une dépendance

# ❌ NE PAS utiliser d'alternatives à yarn
# Ce projet utilise YARN exclusivement
```

## ✨ Fonctionnalités Principales

### 🔐 **Authentification & Sécurité**
- **JWT sécurisé** avec sessions HTTPOnly
- **Rate limiting** protection anti-bruteforce
- **Protection CSRF/XSS** intégrée
- **WAF** (Web Application Firewall)

### 🎫 **Système de Billetterie**
- **Codes QR sécurisés** avec rotation automatique toutes les 12h
- **Validation en temps réel** aux entrées d'événements
- **Emails automatisés** avec templates professionnels
- **Paiements Stripe** intégrés

### 📧 **Système d'Email**
- **7 templates Handlebars** responsives
- **Design professionnel** mobile/desktop
- **Variables dynamiques** et helpers de formatage
- **Cache de performance** pour les templates

### 🏗️ **Infrastructure**
- **Next.js 15** avec App Router
- **PostgreSQL** + Prisma ORM
- **Docker** multi-environnements
- **Monitoring** Prometheus + Grafana

## 🛠️ Outils d'Analyse & de Gestion

Accédez à des outils puissants pour la gestion de la base de données et du projet :

```bash
# Démarrage rapide - Lancer tous les outils
.\scripts-tools.ps1

# Outils disponibles :
# 🗄️  Adminer (Interface PostgreSQL)      → http://localhost:8080 (prod) / 8081 (dev)
# 🐘 pgAdmin (PostgreSQL Avancé)          → http://localhost:8082
# 🔴 Redis Commander                      → http://localhost:8083 (prod) / 8084 (dev)
# 🐳 Portainer (Interface Docker)         → http://localhost:9000
# 📧 Mailhog (Test d'emails)              → http://localhost:8025
# 📈 Grafana (Monitoring)                 → http://localhost:3001
# 🔍 Prometheus (Métriques)               → http://localhost:9090

# Commandes manuelles avec profiles
docker-compose --profile tools up -d
```

## 🚀 Lancement unifié via Docker

Deux scripts simplifient complètement le lancement en mode développement ou production, avec option de monitoring intégrée.

- Linux/Mac: scripts/run-docker.sh
- Windows (PowerShell): scripts/run-docker.ps1

Exemples d’usage:

1) Développement avec monitoring
- Linux/Mac: scripts/run-docker.sh dev up --monitoring --build
- Windows:   scripts/run-docker.ps1 -Env dev -Action up -Monitoring -Build

2) Production avec monitoring
- Linux/Mac: scripts/run-docker.sh prod up --monitoring --build
- Windows:   scripts/run-docker.ps1 -Env prod -Action up -Monitoring -Build

3) Status / Logs / Redémarrage
- Status: scripts/run-docker.sh dev status | scripts/run-docker.ps1 -Env dev -Action status
- Logs:   scripts/run-docker.sh dev logs   | scripts/run-docker.ps1 -Env dev -Action logs
- Restart:scripts/run-docker.sh dev restart| scripts/run-docker.ps1 -Env dev -Action restart

4) Nettoyage / Reconstruction
- Down + volumes:   scripts/run-docker.sh dev down-v | scripts/run-docker.ps1 -Env dev -Action down-v
- Clean complet:    scripts/run-docker.sh dev clean  | scripts/run-docker.ps1 -Env dev -Action clean
- Rebuild complet:  scripts/run-docker.sh dev rebuild| scripts/run-docker.ps1 -Env dev -Action rebuild
- Pull des images:  scripts/run-docker.sh dev pull   | scripts/run-docker.ps1 -Env dev -Action pull
- Prune Docker:     scripts/run-docker.sh dev prune  | scripts/run-docker.ps1 -Env dev -Action prune

5) Outils de vérification et opérations
- Doctor (valider la config): scripts/run-docker.sh dev doctor | scripts/run-docker.ps1 -Env dev -Action doctor
- Seed manuel (dev):          scripts/run-docker.sh dev seed   | scripts/run-docker.ps1 -Env dev -Action seed
- Migrations Prisma (prod):   scripts/run-docker.sh prod migrate | scripts/run-docker.ps1 -Env prod -Action migrate

Variables d’environnement:
- Dev: .env.dev (COMPOSE_ENV=dev, COMPOSE_NETWORK=billetterie-dev-network)
- Prod: .env.prod (COMPOSE_ENV=prod, COMPOSE_NETWORK=billetterie-network)

Alternatives via Yarn (recommandé):
```bash
# Dev
yarn run-docker:dev         # équiv. à: scripts/run-docker.sh dev up --monitoring --build
yarn run-docker:dev:up
yarn run-docker:dev:status
yarn run-docker:dev:logs
yarn run-docker:dev:down
yarn run-docker:dev:clean
yarn run-docker:dev:doctor
yarn run-docker:dev:seed

# Prod
yarn run-docker:prod        # équiv. à: scripts/run-docker.sh prod up --monitoring --build
yarn run-docker:prod:up
yarn run-docker:prod:status
yarn run-docker:prod:logs
yarn run-docker:prod:down
yarn run-docker:prod:clean
yarn run-docker:prod:doctor
yarn run-docker:prod:migrate
```

Notes:
- Assurez-vous d’avoir Docker et Docker Compose v2 installés.
- Si vous obtenez « Permission denied » en lançant scripts/run-docker.sh, utilisez l’une des options suivantes:
  - Exécuter via Yarn (recommandé): `yarn run-docker:dev` ou `yarn run-docker:prod`
  - Exécuter explicitement avec bash: `bash scripts/run-docker.sh dev up`
  - Rendre les scripts exécutables (Linux/WSL): `yarn fix:perms`
- Le monitoring (Prometheus, Grafana, Exporters) est activable via l’option --monitoring/-Monitoring.

Scripts historiques dépréciés:
- docker-manager.sh / docker-manager.ps1 sont obsolètes et arrêtent immédiatement avec un message. Utilisez scripts/run-docker.* ou les commandes Yarn ci-dessus.

📖 **Documentation complète** : [TOOLS_GUIDE.md](./docs/TOOLS_GUIDE.md)

## ⚙️ Lancer Docker sans scripts externes (dev / prod)

Objectif: démarrer via Docker Compose directement, sans passer par les scripts run-docker. Les fichiers Compose déclenchent eux-mêmes ce qu’il faut (génération .env, migrations, seed en dev, etc.).

Commandes simples:

```bash
# Développement (auto-génère .env.dev si absent)
docker compose -f docker-compose.dev.yml up -d

# Production (fichier unique qui inclut base + monitoring,
# auto-génère .env.prod si absent)
docker compose -f docker-compose.prod.yml up -d

# Arrêt
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.prod.yml down

# Validation de la configuration
docker compose -f docker-compose.dev.yml config
docker compose -f docker-compose.prod.yml config
```

Ce qui est automatisé:
- Génération d’environnement:
  - Service envgen-dev dans docker-compose.dev.yml → crée .env.dev si manquant
  - Service envgen-prod dans docker-compose.prod.yml → crée .env.prod si manquant
  - Les fichiers existants ne sont jamais écrasés
- Développement:
  - Le conteneur web-dev applique prisma generate + migrate deploy
  - Le seed s’exécute automatiquement si `SEED=true` (par défaut)
- Production:
  - Services utilitaires `migrate` et `init-admin` disponibles à la demande

Notes:
- Requiert Docker Compose v2.20+ pour la directive `include` utilisée dans docker-compose.dev.yml et docker-compose.prod.yml.
- En prod, un seul fichier est désormais suffisant: `docker-compose.prod.yml` inclut automatiquement la base et le monitoring.
- Remplacez les placeholders sensibles dans `.env.prod` (Stripe, SMTP, domaine, etc.).

## ☸️ Déploiement Kubernetes

> Kubernetes fait partie du processus de déploiement officiel. Les manifestes sont situés dans `k8s/`.

Prérequis:
- kubectl installé et contexte configuré vers votre cluster
- Namespace par défaut: `billetterie` (surchargable via `K8S_NAMESPACE`)

Commandes Yarn utiles:
```bash
# Déployer/mettre à jour la stack
yarn k8s:deploy                    # utilise k8s/production.yaml par défaut

# Vérifier l'état des objets (deployments, services, ingress, pods)
yarn k8s:status                    # namespace par défaut billetterie

# Suivre les déploiements et logs
yarn k8s:rollout:status            # attend le déploiement billetterie-web
yarn k8s:logs                      # suit les logs des pods labelisés app=billetterie

# Redémarrer un déploiement
yarn k8s:restart

# Vérification rapide (cluster, contexte, manifestes)
yarn k8s:doctor

# Variables optionnelles
# K8S_NAMESPACE=billetterie K8S_DEPLOYMENT=billetterie-web K8S_APP_LABEL=billetterie K8S_MANIFEST=k8s/production.yaml
```

Notes:
- Ne supprimez pas le dossier `k8s/` ni `k8s-deploy.ps1` — ils sont requis pour le déploiement.
- Des guides détaillés sont disponibles: [docs/KUBERNETES_DEPLOYMENT.md](./docs/KUBERNETES_DEPLOYMENT.md).

## 🧪 Tests et Développement

```bash
# Tests système
yarn test:qr             # Test des codes QR
yarn email:info          # Infos système email

# Tests de développement  
yarn test                # Tests unitaires
yarn type-check          # Vérification TypeScript

# Test API (dev uniquement)
curl http://localhost:3000/api/test/emails
```

## 🔁 Environnement de développement complet

Le mode développement via Docker est optimisé pour être le plus confortable possible:

- Hot Reload immédiat grâce à Next.js (Fast Refresh) et au montage des volumes
  - Le code source de l’hôte est monté dans le conteneur (`.:/app`)
  - La commande de dev dans le conteneur est `yarn dev:docker` (port 3001)
  - Pas de polling lourd: configuration webpack adaptée (voir `next.config.js`)
- Jeu de données de test automatique (seed) en dev
  - Au démarrage, le conteneur applique les migrations Prisma puis exécute le seed si `SEED=true`
  - Contrôle via `.env.dev` → `SEED=true|false`
  - Vous pouvez relancer manuellement le seed si besoin:
    - Docker: `docker compose -f docker-compose.dev.yml exec web-dev yarn prisma db seed`
    - Local (hors Docker): `yarn db:seed`
- Emails de test redirigés vers Mailhog
  - `.env.dev` configure `SMTP_HOST=mailhog` et `SMTP_PORT=1025`
  - Interface Mailhog: http://localhost:8025
- Outils Dev à portée de main
  - Adminer (PostgreSQL): http://localhost:8081
  - Redis Commander: http://localhost:8084

Résumé des ports (dev):
- App: http://localhost:3001
- PostgreSQL: 5433 (hôte) → `db-dev:5432` (interne)
- Redis: 6380 (hôte) → `redis-dev:6379` (interne)
- Mailhog: 8025 (UI) / 1025 (SMTP)
- Adminer: 8081
- Redis Commander: 8084

Astuce: pour désactiver temporairement le seed auto, placez `SEED=false` dans `.env.dev` puis relancez la stack dev.

Aliases Yarn pratiques (optionnels):
```bash
# Démarrer/arrêter via Yarn sans scripts externes
yarn docker:dev:up
yarn docker:dev:down
yarn docker:prod:up
yarn docker:prod:down
```

## 🗄️ Prisma: Dev & Prod

- Développement:
  - Les migrations Prisma sont appliquées automatiquement au démarrage du conteneur dev (`prisma migrate deploy`).
  - Le seed est exécuté automatiquement si `SEED=true` dans `.env.dev`.

- Production:
  - Le client Prisma est généré au build de l’image (Dockerfile.next), ce qui garantit la compatibilité schéma ↔ application.
  - Les migrations ne sont pas lancées automatiquement au démarrage de l’app pour des raisons d’opérations/contrôle.
  - Exécutez-les à la demande via le service utilitaire `migrate`:
    - Linux/Mac: `scripts/run-docker.sh prod migrate`
    - Windows:   `scripts/run-docker.ps1 -Env prod -Action migrate`
  - Ce service installe les dépendances nécessaires puis lance `yarn prisma migrate deploy` contre la base `db` du cluster prod.

## ✅ Test rapide (Linux/macOS) du lancement dev

```bash
# 1) Vérifier la configuration
scripts/run-docker.sh dev doctor

# 2) Lancer l’environnement complet (avec monitoring)
scripts/run-docker.sh dev up --monitoring --build

# 3) Vérifier l’état et les logs
scripts/run-docker.sh dev status
scripts/run-docker.sh dev logs

# 4) Optionnel: relancer le seed
scripts/run-docker.sh dev seed

# 5) Arrêt et nettoyage
scripts/run-docker.sh dev down
# ou
scripts/run-docker.sh dev clean
```

## 🔧 Scripts Disponibles

#### **Utilisateurs**
```
GET    /api/users              # Liste des utilisateurs (admin)
GET    /api/users/:id          # Détails d'un utilisateur
PUT    /api/users/:id          # Modifier un utilisateur
DELETE /api/users/:id          # Supprimer un utilisateur
```

### **Vérification de Santé**
```
GET    /health                 # Statut de l'API
```

## 🛠️ Stack Technique

- **Framework** : Next.js 15 + TypeScript + React 18
- **Base de données** : PostgreSQL 16 + Prisma ORM
- **Cache** : Redis 7
- **Authentification** : JWT + Better Auth
- **Paiements** : Stripe
- **Infrastructure** : Docker + Docker Compose
- **Monitoring** : Prometheus + Grafana
- **Tests** : Jest + Playwright + Stryker
| Script | Description |
|--------|-------------|
| `yarn dev` | Démarrage en développement |
| `yarn build` | Build de production |
| `yarn test` | Tests unitaires |
| `yarn test:qr` | Tests du système QR |
| `yarn email:info` | Informations système email |
| `yarn db:migrate` | Migrations de base de données |
| `docker-compose up -d` | Mode standard (3 conteneurs) |
| `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d` | Mode développement |
| `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | Mode production |
| `docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d` | Mode monitoring complet |



## 🛡️ Sécurité et Monitoring

- ✅ **WAF** avec Nginx et ModSecurity
- ✅ **Rate limiting** par IP et utilisateur  
- ✅ **Codes QR rotatifs** toutes les 12h
- ✅ **Chiffrement AES-256** pour les données sensibles
- ✅ **Monitoring** Prometheus + Grafana
- ✅ **Logs d'audit** pour toutes les actions critiques
- ✅ **Sauvegarde automatisée** PostgreSQL

## 🚀 Déploiement

### 🐳 Environnements Docker

#### **Mode Développement** (3 conteneurs)
```bash
# Démarrer avec hot reload et debug
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Logs en temps réel
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web

# Arrêter
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

#### **Mode Production** (6-8 conteneurs)
```bash
# Démarrer avec SSL, monitoring et sécurité
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Avec certificats SSL automatiques
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile ssl up -d

# Avec sauvegarde automatisée
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup up -d

# Arrêter
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

#### **Mode Monitoring Complet** (9 conteneurs)
```bash
# Démarrer avec monitoring étendu (Prometheus, Grafana, Exporters)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Accéder aux services de monitoring
# - Grafana: http://localhost:3001
# - Prometheus: http://localhost:9090
# - AlertManager: http://localhost:9093

# Arrêter
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml down
```

#### **Mode Standard** (3 conteneurs - configuration de base)
```bash
# Démarrage simple pour tester
docker-compose up -d

# Arrêter
docker-compose down
```

### Variables d'Environnement Critiques
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_...
EMAIL_HOST=smtp.gmail.com
QR_ROTATION_SECRET=...
```

## ✨ État Actuel

### ✅ **Systèmes Opérationnels (v1.2.0)**
- **Authentification JWT sécurisée** avec sessions
- **Codes QR rotatifs** avec validation en temps réel
- **Emails automatisés** avec 7 templates professionnels
- **Paiements Stripe intégrés** sécurisés
- **Infrastructure Docker multi-environnements**
- **Monitoring & alertes** Prometheus + Grafana
- **WAF et sécurité** prêts pour la production

### 🎯 **Feuille de Route**
- 📱 **Application mobile** React Native (T3 2025)
- 🔔 **Notifications push** en temps réel (T3 2025)  
- 🌍 **Multi-langue** i18n (T4 2025)
- 🤖 **Recommandations IA** événements (2026)

## 🎊 Plateforme Prête pour la Production !

Cette plateforme est **complète** et **opérationnelle** pour un déploiement immédiat :

- ✅ **Sécurité** : WAF, rate limiting, chiffrement, audits
- ✅ **Performance** : Cache, optimisations, monitoring
- ✅ **Scalabilité** : Architecture prête pour les microservices
- ✅ **Maintenance** : Logs structurés, sauvegardes automatisées
- ✅ **Documentation** : Complète et à jour dans `/docs`

## 📞 Support

- **📚 Documentation** : [`/docs`](./docs/README.md) - Index complet
- **🐛 Bugs** : [GitHub Issues](https://github.com/CorentinCoulet/M-C-Billetterie/issues)
- **💬 Questions** : [GitHub Discussions](https://github.com/CorentinCoulet/M-C-Billetterie/discussions)
- **🔐 Sécurité** : [SECURITY.md](./SECURITY.md)
- **🤝 Contribution** : [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

## 🗺️ Roadmap

Voir [ROADMAP.md](./docs/ROADMAP.md) pour la feuille de route complète.

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

**🚀 Développé avec ❤️ - Plateforme de billetterie moderne et sécurisée**

**Version actuelle** : 1.2.0 | **Dernière mise à jour** : 11 Octobre 2025
