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

# Démarrer le développement
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

📖 **Documentation complète** : [TOOLS_GUIDE.md](./docs/TOOLS_GUIDE.md)

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
