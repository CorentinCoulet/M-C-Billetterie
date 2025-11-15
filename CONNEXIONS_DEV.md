# 🔐 Informations de Connexion - Environnement DÉVELOPPEMENT

⚠️ **ATTENTION** : Ces identifiants sont UNIQUEMENT pour l'environnement de développement LOCAL.  
❌ **NE JAMAIS utiliser ces identifiants en production !**

---

## 🌐 Applications Web

### 🎫 Application Principale (Next.js)
- **URL** : http://localhost:3001
- **Description** : Application de billetterie avec **HOT RELOAD ACTIVÉ** 🔥
- **Mode** : Développement
- **Docker Service** : `web-dev`
- **Hot Reload** : ✅ Configuré avec Fast Refresh (CHOKIDAR_USEPOLLING activé)
- **Debug Port** : 9229 (pour le débogage Node.js)

### 🗄️ Adminer (Interface PostgreSQL)
- **URL** : http://localhost:8081
- **Système** : `PostgreSQL`
- **Serveur** : `db-dev` (ou `postgres-dev` depuis le réseau Docker)
- **Utilisateur** : `postgres`
- **Mot de passe** : `DevPostgres2024!SecureDB`
- **Base de données** : `billetterie`
- **Docker Service** : `adminer`

### 🔴 Redis Commander (Interface Redis)
- **URL** : http://localhost:8084
- **Authentification HTTP** :
  - Utilisateur : `admin`
  - Mot de passe : `admin`
- **Docker Service** : `redis-commander`

### 📧 MailHog (Test d'emails)
- **URL Web** : http://localhost:8025
- **SMTP** : `localhost:1025`
- **Description** : Capture TOUS les emails envoyés par l'application
- **Docker Service** : `mailhog`

### 📊 Grafana (Dashboards & Monitoring)
- **URL** : http://localhost:3002
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`
- **Description** : Tableaux de bord de monitoring
- **Docker Service** : `grafana-dev`

### 📈 Prometheus (Métriques)
- **URL** : http://localhost:9090
- **Description** : Collecte et stockage des métriques
- **Docker Service** : `prometheus-dev`

### 🚨 AlertManager (Alertes)
- **URL** : http://localhost:9093
- **Description** : Gestion des alertes système
- **Docker Service** : `alertmanager-dev`

---

## 🗄️ Bases de Données (Connexions Directes)

### PostgreSQL
- **Host** : `localhost` (ou `postgres-dev` depuis Docker)
- **Port** : `5433` (mappé depuis 5432)
- **User** : `postgres`
- **Password** : `DevPostgres2024!SecureDB`
- **Database** : `billetterie`
- **Connection String** : 
  ```
  postgresql://postgres:DevPostgres2024!SecureDB@localhost:5433/billetterie
  ```
- **Depuis Docker** :
  ```
  postgresql://postgres:DevPostgres2024!SecureDB@postgres-dev:5432/billetterie
  ```
- **Docker Service** : `db-dev` (container: `postgres-dev`)

### Redis
- **Host** : `localhost` (ou `redis-dev` depuis Docker)
- **Port** : `6380` (mappé depuis 6379)
- **Password** : `DevRedis2024!SecureCache`
- **Connection String** :
  ```
  redis://:DevRedis2024!SecureCache@localhost:6380
  ```
- **Depuis Docker** :
  ```
  redis://:DevRedis2024!SecureCache@redis-dev:6379
  ```
- **Docker Service** : `redis-dev`

---

## 👤 Comptes de Test (après seed)

### 🔑 Super Admin
- **Email** : `admin@billetterie.local`
- **Mot de passe** : `Admin123!Dev`
- **Rôle** : `SUPER_ADMIN`
- **Permissions** : Accès complet

### 🎭 Organisateur
- **Email** : `organizer@billetterie.local`
- **Mot de passe** : `Organizer123!Dev`
- **Rôle** : `ORGANIZER`
- **Permissions** : Gestion d'événements

### 👥 Utilisateur Standard
- **Email** : `user@billetterie.local`
- **Mot de passe** : `User123!Dev`
- **Rôle** : `USER`
- **Permissions** : Achat de billets

---

## 📊 Exporters (Endpoints Métriques)

- **Node Exporter** : http://localhost:9100/metrics (système)
- **PostgreSQL Exporter** : http://localhost:9187/metrics (database)
- **Redis Exporter** : http://localhost:9121/metrics (cache)

---

## 🔥 Hot Reload (Rechargement à chaud)

Le **hot reload est ENTIÈREMENT configuré** et fonctionnel dans l'environnement Docker !

### ✅ Configuration Active

Les variables d'environnement suivantes sont activées dans `docker-compose.dev.yml` :

```yaml
WATCHPACK_POLLING: true          # Surveillance des fichiers
CHOKIDAR_USEPOLLING: true        # Polling pour Docker/WSL
CHOKIDAR_INTERVAL: 100           # Vérification toutes les 100ms
FAST_REFRESH: true               # Fast Refresh Next.js
TSC_NONPOLLING_WATCHER: true     # Optimisation TypeScript
```

### 🧪 Tester le Hot Reload

1. **Modifier un fichier** (ex: `app/page.tsx`)
2. **Sauvegarder** (Ctrl+S)
3. **Regarder les logs** :
   ```bash
   docker compose logs -f web-dev
   ```
4. **Le navigateur se rafraîchit automatiquement** (dans 2-5 secondes)

### 🐛 Si le Hot Reload ne fonctionne pas

```bash
# 1. Vérifier que le conteneur tourne en mode dev
docker compose ps web-dev

# 2. Vérifier les variables d'environnement
docker compose exec web-dev env | grep CHOKIDAR

# 3. Redémarrer le conteneur
docker compose restart web-dev

# 4. Vérifier les permissions sur .next
ls -la .next
sudo chown -R $USER:$USER .next

# 5. Rebuild complet si nécessaire
docker compose down
docker compose build --no-cache web-dev
docker compose up -d
```

### ⚡ Optimisations

- **Volumes montés** : Le code source est monté en temps réel (`- .:/app`)
- **Fast Refresh** : Seuls les composants modifiés sont rechargés
- **Pas de perte d'état** : React garde l'état pendant le rechargement
- **Compilation incrémentale** : Next.js ne recompile que ce qui change

---

## 🐳 Commandes Docker Essentielles

### Démarrage
```bash
# Démarrer TOUT (dev + monitoring)
cd /home/corentin/M-C-Billetterie
docker compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d

# Voir l'état des conteneurs
docker compose ps

# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f web-dev
docker compose logs -f db-dev
docker compose logs -f redis-dev
```

### Arrêt
```bash
# Arrêter tout (garde les volumes)
docker compose down

# Arrêter tout + supprimer les volumes
docker compose down -v

# Arrêter un service spécifique
docker compose stop web-dev
```

### Maintenance
```bash
# Recréer un conteneur
docker compose up -d --force-recreate web-dev

# Rebuild sans cache
docker compose build --no-cache

# Voir l'utilisation des ressources
docker stats

# Voir les réseaux
docker network ls | grep billetterie
```

---

## 🔧 Debugging & Résolution de Problèmes

### ❌ Erreur : "EACCES: permission denied, open '/app/.next/...'"
```bash
# Depuis WSL, dans le répertoire du projet
sudo chown -R $USER:$USER .next
sudo chmod -R 755 .next

# Puis redémarrer le conteneur
docker compose restart web-dev
```

### ❌ Erreur : "DATABASE_URL not set" ou validation Zod
```bash
# Vérifier que le .env.dev existe
cat .env.dev

# Vérifier les variables dans le conteneur
docker compose exec web-dev env | grep DATABASE

# Si problème, recréer le conteneur
docker compose up -d --force-recreate web-dev
```

### ❌ Erreur : "network billetterie-dev-network not found"
```bash
# Créer le réseau
docker network create billetterie-dev-network

# Puis redémarrer
docker compose up -d
```

### ❌ Base de données vide (pas de tables)
```bash
# Exécuter les migrations Prisma
docker compose exec web-dev npx prisma migrate deploy

# Seed (données de test)
docker compose exec web-dev npx prisma db seed
```

### 🔄 Reset complet
```bash
# ATTENTION : Supprime TOUTES les données !
docker compose down -v
docker volume prune -f
rm -rf .next node_modules
docker compose build --no-cache
docker compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d
```

---

## 🔍 Vérifications Santé

```bash
# Vérifier que tous les conteneurs sont healthy
docker compose ps

# Tester PostgreSQL
docker compose exec db-dev psql -U postgres -d billetterie -c "SELECT version();"

# Tester Redis
docker compose exec redis-dev redis-cli -a DevRedis2024!SecureCache ping

# Tester l'application
curl http://localhost:3001
curl http://localhost:3001/api/health
```

---

## 📝 Variables d'Environnement Clés

Fichier : `.env.dev`

```bash
# Database
DATABASE_URL=postgresql://postgres:DevPostgres2024!SecureDB@postgres-dev:5432/billetterie
DB_PASSWORD=DevPostgres2024!SecureDB

# Redis
REDIS_URL=redis://:DevRedis2024!SecureCache@redis-dev:6379
REDIS_PASSWORD=DevRedis2024!SecureCache

# JWT
JWT_SECRET=dev_jwt_secret_key_not_for_production_2024

# Email
SMTP_HOST=mailhog
SMTP_PORT=1025
EMAIL_FROM=noreply@billetterie.local

# Stripe (mode test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

---

## ⚠️ Rappels de Sécurité

- ✅ Ces identifiants sont **UNIQUEMENT** pour le développement local
- ❌ **NE JAMAIS** committer les fichiers `.env.dev` ou `.env.prod`
- ❌ **NE JAMAIS** utiliser ces mots de passe en production
- ✅ En production, utiliser des secrets générés aléatoirement
- ✅ Toujours utiliser HTTPS en production

---

**Dernière mise à jour** : 2025-11-14  
**Environnement** : Développement Local (Docker Compose)

