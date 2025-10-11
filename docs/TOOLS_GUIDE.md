# 🛠️ Guide des Outils - Billetterie Project

Ce guide présente tous les outils disponibles pour le développement, le monitoring, l'analyse et la gestion du projet Billetterie.

---

## 📋 Table des matières

- [Outils de Développement](#outils-de-développement)
- [Outils de Base de Données](#outils-de-base-de-données)
- [Outils de Monitoring](#outils-de-monitoring)
- [Outils de Test](#outils-de-test)
- [Scripts Utilitaires](#scripts-utilitaires)
- [Outils Docker](#outils-docker)
- [Configuration et Accès](#configuration-et-accès)

---

## 🚀 Démarrage Rapide

### Lancer TOUS les Outils

```powershell
# PowerShell (Windows)
.\scripts-tools.ps1

# Ou avec Docker Compose directement (utilise les profiles)
docker-compose --profile tools up -d

# En environnement de développement
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up -d

# En environnement de production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile tools up -d
```

Cette commande démarre automatiquement tous les outils de développement et de monitoring.

---

## 🔧 Outils de Développement

### 1. **VS Code avec Extensions**

**Extensions Recommandées :**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "bradlc.vscode-tailwindcss",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens",
    "ms-playwright.playwright"
  ]
}
```

**Configuration automatique** : `.vscode/settings.json` est déjà configuré

### 2. **Yarn (Gestionnaire de Paquets)**

⚠️ **IMPORTANT** : Ce projet utilise YARN exclusivement (npm n'est pas supporté)

```bash
# Vérifier la configuration Yarn
yarn yarn:check

# Audit des dépendances
yarn yarn:audit

# Mise à jour interactive
yarn yarn:upgrade-interactive

# Nettoyer le cache
yarn yarn:clean
```

### 3. **Nodemon (Auto-reload)**

Pour le développement avec auto-reload :

```bash
# Démarrer avec nodemon
yarn dev

# Ou directement
nodemon --watch 'src/**/*.ts' --exec 'ts-node' src/index.ts
```

---

## 🗄️ Outils de Base de Données

### 1. **Adminer** (Interface PostgreSQL Légère)

**Accès :**
- **Développement** : http://localhost:8081
- **Production** : http://localhost:8080

**Connexion :**
```
Système : PostgreSQL
Serveur : postgres (ou localhost:5432)
Utilisateur : billetterie_user
Mot de passe : (voir .env)
Base : billetterie_db
```

**Fonctionnalités :**
- ✅ Interface légère et rapide
- ✅ Exécution de requêtes SQL
- ✅ Navigation des tables
- ✅ Import/Export de données
- ✅ Gestion des index et contraintes

**Captures d'écran et guide** :
- Voir les tables et leurs relations
- Exécuter des requêtes complexes
- Exporter des données en CSV/SQL

### 2. **pgAdmin** (Interface PostgreSQL Avancée)

**Accès :** http://localhost:8082

**Première Connexion :**
```
Email : admin@billetterie.com
Mot de passe : admin123 (à changer en production)
```

**Ajouter un serveur :**
1. Clic droit sur "Servers" → "Create" → "Server"
2. **Général** :
   - Name: Billetterie DB
3. **Connection** :
   - Host: postgres
   - Port: 5432
   - Maintenance database: billetterie_db
   - Username: billetterie_user
   - Password: (voir .env)

**Fonctionnalités Avancées :**
- ✅ Éditeur SQL avec autocomplétion
- ✅ Visualisation graphique des requêtes
- ✅ Backup/Restore automatisé
- ✅ Monitoring des performances
- ✅ Gestion des rôles et permissions
- ✅ Query planner et optimisation

### 3. **Prisma Studio**

**Démarrer Prisma Studio :**

```bash
yarn db:studio
```

**Accès :** http://localhost:5555

**Fonctionnalités :**
- ✅ Interface graphique pour Prisma
- ✅ Navigation des données avec relations
- ✅ Édition WYSIWYG des enregistrements
- ✅ Filtres et recherche
- ✅ Création/modification de données

**Cas d'usage :**
- Seed de données de test
- Debug des relations Prisma
- Inspection rapide des données

### 4. **Redis Commander** (Interface Redis)

**Accès :**
- **Développement** : http://localhost:8084
- **Production** : http://localhost:8083

**Fonctionnalités :**
- ✅ Visualisation des clés Redis
- ✅ Édition des valeurs
- ✅ Analyse de la mémoire
- ✅ Recherche et filtrage
- ✅ Stats en temps réel
- ✅ CLI intégré

**Cas d'usage :**
- Vérifier les sessions utilisateurs
- Debugger le cache
- Analyser le rate limiting
- Monitorer les performances

---

## 📊 Outils de Monitoring

### 1. **Prometheus** (Métriques)

**Accès :** http://localhost:9090

**Métriques Disponibles :**

```promql
# Métriques Infrastructure
nodejs_heap_used_bytes
nodejs_heap_total_bytes
process_cpu_user_seconds_total
http_requests_total
http_request_duration_seconds

# Métriques Base de Données
postgres_connections_active
postgres_connections_idle
postgres_query_duration_seconds

# Métriques Business
events_total
tickets_sold_total
revenue_total_cents
active_users_total

# Métriques Sécurité
rate_limit_hits_total
auth_failures_total
suspicious_activities_total
```

**Requêtes Utiles :**

```promql
# Taux d'erreurs HTTP 5xx
rate(http_requests_total{status=~"5.."}[5m])

# Temps de réponse moyen
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Utilisation mémoire %
nodejs_heap_used_bytes / nodejs_heap_total_bytes * 100

# Connexions DB actives
postgres_connections_active
```

### 2. **Grafana** (Dashboards)

**Accès :** http://localhost:3001

**Première Connexion :**
```
Username : admin
Password : admin123
```

**Dashboards Pré-configurés :**

1. **Overview Dashboard**
   - Métriques générales
   - Santé du système
   - Performance globale

2. **Infrastructure Dashboard**
   - CPU, Mémoire, Disque
   - Connexions réseau
   - Containers Docker

3. **Business Dashboard**
   - Revenus en temps réel
   - Billets vendus
   - Événements actifs
   - Utilisateurs en ligne

4. **Security Dashboard**
   - Tentatives d'authentification
   - Rate limiting
   - Activités suspectes
   - Alertes de sécurité

**Configuration Prometheus dans Grafana :**
1. Configuration → Data Sources → Add data source
2. Sélectionner Prometheus
3. URL : http://prometheus:9090
4. Save & Test

### 3. **AlertManager** (Alertes)

**Accès :** http://localhost:9093

**Configuration des Alertes :**

Voir `monitoring/alert_rules.yml` pour la configuration complète.

**Canaux d'Alerte :**
- 📧 Email
- 💬 Discord
- 📱 Slack
- 🔔 PagerDuty (production)

### 4. **Sentry** (Error Tracking)

**Configuration :**

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

**Fonctionnalités :**
- ✅ Capture automatique des erreurs
- ✅ Stack traces détaillées
- ✅ Breadcrumbs pour contexte
- ✅ Release tracking
- ✅ Performance monitoring
- ✅ Sanitisation des données sensibles

**Accès :** Via votre compte Sentry.io

---

## 🧪 Outils de Test

### 1. **Jest** (Tests Unitaires)

```bash
# Tous les tests
yarn test

# Mode watch
yarn test:watch

# Avec coverage
yarn test:coverage

# Tests spécifiques
yarn test:unit          # Unitaires uniquement
yarn test:integration   # Intégration
yarn test:api          # API
```

**Coverage Report :** `coverage/lcov-report/index.html`

### 2. **Playwright** (Tests E2E)

```bash
# Tous les tests E2E
yarn test:e2e

# Interface graphique (recommandé)
yarn test:e2e:ui

# Mode debug
yarn test:e2e:debug

# Rapport HTML
yarn test:e2e:report
```

**Accès Rapport :** `playwright-report/index.html`

### 3. **Stryker** (Tests de Mutation)

```bash
# Tests de mutation
yarn test:mutation

# Rapport de mutation
open stryker-report/index.html
```

### 4. **Artillery** (Tests de Performance)

```bash
# Load testing standard
yarn perf:artillery

# Load testing extrême
yarn perf:artillery:extreme

# Avec rapport détaillé
yarn perf:artillery:report
```

### 5. **Mailhog** (Test d'Emails)

**Accès :** http://localhost:8025

**Configuration :**
```env
# .env pour utiliser Mailhog
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

**Fonctionnalités :**
- ✅ Capture tous les emails envoyés
- ✅ Interface web pour consulter
- ✅ Recherche et filtres
- ✅ Visualisation HTML/Text
- ✅ API REST pour automatisation

**Cas d'usage :**
- Tester les templates d'emails
- Vérifier le contenu des QR codes
- Debugger les notifications

---

## 📜 Scripts Utilitaires

### Scripts de Base de Données

```bash
# Migrations
yarn db:migrate         # Créer et appliquer migration
yarn db:migrate:deploy  # Appliquer en production
yarn db:generate        # Générer client Prisma

# Seed
yarn db:seed           # Données de test
yarn db:clean          # Nettoyer la DB
yarn db:reset          # Reset complet

# Studio
yarn db:studio         # Interface Prisma
```

### Scripts de Test du Système

```bash
# Test du système QR
yarn qr:test           # Tester la génération/validation
yarn qr:rotate         # Forcer une rotation

# Test du système Email
yarn email:test        # Tester tous les templates
yarn email:info        # Infos sur la config
```

### Scripts de Performance

```bash
# Tests de performance complets
yarn perf:suite        # Suite standard
yarn perf:suite:full   # Suite complète

# Tests spécifiques
yarn perf:http         # HTTP performance
yarn perf:docker       # Docker diagnostic
yarn perf:api          # API benchmarks
yarn perf:db           # Database performance
yarn perf:cache        # Cache performance
```

### Scripts de Production

```bash
# Validation
yarn prod:validate     # Valider la config production

# Déploiement
yarn prod:setup        # Setup initial
yarn prod:deploy       # Déployer

# Monitoring post-déploiement
yarn prod:monitor              # Vérification unique
yarn prod:monitor:continuous   # Surveillance continue
```

---

## 🐳 Outils Docker

### 1. **Portainer** (Interface Docker)

**Accès :** http://localhost:9000

**Première Configuration :**
1. Créer un compte admin
2. Connecter à Docker local
3. Endpoint: unix:///var/run/docker.sock

**Fonctionnalités :**
- ✅ Gestion visuelle des containers
- ✅ Logs en temps réel
- ✅ Stats de ressources
- ✅ Gestion des images
- ✅ Réseaux et volumes
- ✅ Stacks et Compose
- ✅ Console interactive

**Cas d'usage :**
- Monitoring des containers
- Restart rapide de services
- Analyse des logs
- Nettoyage des ressources

### 2. **Docker Compose UI**

Utiliser Portainer ou les commandes CLI :

```bash
# Status des containers
docker-compose ps

# Logs
docker-compose logs -f [service]

# Restart d'un service
docker-compose restart [service]

# Stats en temps réel
docker stats
```

### 3. **Scripts Docker PowerShell**

```powershell
# Script principal - Gestion des environnements
.\scripts-docker-parallel.ps1

# Script des outils
.\scripts-tools.ps1

# Script custom
.\start-docker.ps1 dev -Up
.\start-docker.ps1 prod -Up
.\start-docker.ps1 dev -Down
```

---

## ⚙️ Configuration et Accès

### Tableau Récapitulatif

| Outil | Port Dev | Port Prod | Credentials | Documentation |
|-------|----------|-----------|-------------|---------------|
| **Application** | 3000 | 3000 | - | - |
| **Adminer** | 8081 | 8080 | DB credentials | [Adminer](https://www.adminer.org/) |
| **pgAdmin** | 8082 | - | admin@billetterie.com / admin123 | [pgAdmin](https://www.pgadmin.org/) |
| **Redis Commander** | 8084 | 8083 | - | [Redis Commander](https://github.com/joeferner/redis-commander) |
| **Portainer** | 9000 | 9000 | Create on first use | [Portainer](https://www.portainer.io/) |
| **Mailhog** | 8025 | - | - | [Mailhog](https://github.com/mailhog/MailHog) |
| **Grafana** | 3001 | 3001 | admin / admin123 | [Grafana](https://grafana.com/) |
| **Prometheus** | 9090 | 9090 | - | [Prometheus](https://prometheus.io/) |
| **AlertManager** | 9093 | 9093 | - | [AlertManager](https://prometheus.io/docs/alerting/latest/alertmanager/) |
| **Prisma Studio** | 5555 | - | - | [Prisma](https://www.prisma.io/) |

### Variables d'Environnement

Pour configurer les outils, voir `.env.example` :

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://...
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=admin123

# Email Testing
SMTP_HOST=mailhog
SMTP_PORT=1025
```

---

## 🎯 Workflows Recommandés

### Workflow de Développement

1. **Démarrer les outils**
   ```bash
   .\scripts-tools.ps1
   ```

2. **Ouvrir les dashboards essentiels**
   - Mailhog (emails)
   - Adminer (DB)
   - Redis Commander (cache)

3. **Développer avec auto-reload**
   ```bash
   yarn dev
   ```

4. **Tester régulièrement**
   ```bash
   yarn test:watch
   ```

### Workflow de Debug

1. **Consulter les logs**
   - Portainer pour logs containers
   - Grafana pour métriques
   - Sentry pour erreurs

2. **Analyser la base de données**
   - pgAdmin pour requêtes complexes
   - Prisma Studio pour inspection rapide

3. **Vérifier le cache**
   - Redis Commander pour état du cache

4. **Tester les emails**
   - Mailhog pour voir les emails envoyés

### Workflow de Performance

1. **Monitoring de base**
   - Grafana Dashboard
   - Prometheus metrics

2. **Tests de charge**
   ```bash
   yarn perf:suite:full
   ```

3. **Analyse**
   - Grafana pour visualisation
   - Artillery reports pour détails

---

## 🆘 Dépannage

### Problèmes Courants

**1. Port déjà utilisé**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Ou changer le port dans docker-compose
```

**2. Container ne démarre pas**
```bash
# Voir les logs
docker-compose logs [service]

# Rebuild
docker-compose up -d --build [service]
```

**3. Adminer ne se connecte pas**
- Vérifier DATABASE_URL
- Utiliser `postgres` comme serveur (pas localhost)
- Vérifier les credentials

**4. Grafana dashboards vides**
- Vérifier la connexion Prometheus
- URL : http://prometheus:9090
- Vérifier que l'app expose /api/metrics

---

## 📚 Ressources Supplémentaires

### Documentation Officielle

- [Adminer Docs](https://www.adminer.org/en/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Prisma Guides](https://www.prisma.io/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Prometheus Docs](https://prometheus.io/docs/introduction/overview/)

### Tutoriels Vidéo

- [pgAdmin Basics](https://youtube.com/...)
- [Grafana Dashboards](https://youtube.com/...)
- [Docker Monitoring](https://youtube.com/...)

---

## 🎉 Conclusion

Vous avez maintenant accès à une suite complète d'outils pour le développement, le monitoring et l'analyse de la plateforme Billetterie !

**Commandes Essentielles à Retenir :**

```bash
.\scripts-tools.ps1           # Démarrer tous les outils
yarn dev                      # Développement
yarn test:watch               # Tests en continu
yarn db:studio                # Interface DB
docker-compose logs -f        # Logs en temps réel
```

---

**Dernière mise à jour** : 11 Octobre 2025  
**Maintenu par** : L'équipe Billetterie Project  
**Questions ?** Ouvrez une issue GitHub ou consultez la [documentation complète](./README.md)
