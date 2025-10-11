# 📂 Scripts Directory - Billetterie Platform

Ce dossier contient tous les scripts utilitaires du projet. Après nettoyage (oct 2025), seuls les scripts actifs et référencés sont conservés.

## 📊 Structure

```
scripts/
├── 📁 backup/          (1 script)  - Sauvegarde et restauration
├── 📁 deployment/      (5 scripts) - Déploiement production
├── 📁 development/     (2 scripts) - Outils de développement
├── 📁 maintenance/     (2 scripts) - Maintenance système
├── 📁 security/        (5 scripts) - Opérations sécurité
└── 📁 testing/         (9 scripts) - Tests et benchmarks
```

**Total**: 24 scripts actifs

---

## 🚀 Scripts Principaux (Racine du Projet)

### `scripts-tools.ps1` 🛠️
**Menu interactif PowerShell** pour gérer tous les environnements.

```powershell
.\scripts-tools.ps1
```

**Fonctionnalités**:
- ✅ Démarrer environnements DEV/PROD
- ✅ Gérer Docker, monitoring
- ✅ Accès rapide aux outils (Adminer, Redis, Grafana...)
- ✅ Backup base de données
- ✅ Tests connexions (PostgreSQL, Redis)
- ✅ Kubernetes local

### `k8s-deploy.ps1` ☸️
**Déploiement Kubernetes** local.

```powershell
.\k8s-deploy.ps1 -Action deploy-simple   # Déploiement simple
.\k8s-deploy.ps1 -Action status          # État du cluster
.\k8s-deploy.ps1 -Action cleanup         # Nettoyage
```

---

## 📂 Scripts par Catégorie

### 🔒 Backup (`scripts/backup/`)

#### `backup.ts`
Backup TypeScript avec rotation automatique.

**Référence**: Fonction intégrée dans `scripts-tools.ps1` (option 33)

---

### 🚀 Deployment (`scripts/deployment/`)

#### `deploy-production.sh` ⚠️
Script de déploiement production (Shell).

```bash
./scripts/deployment/deploy-production.sh production
```

**Note**: Seul script `.sh` conservé (référencé dans package.json). À migrer vers PowerShell.

**Référence package.json**: `yarn prod:deploy`

#### `quick-setup-production.js`
Setup rapide de l'environnement production.

```bash
yarn prod:setup
```

#### `validate-production.ts`
Validation configuration production.

```bash
yarn prod:validate
```

#### `post-deployment-monitor.ts`
Monitoring post-déploiement.

```bash
yarn prod:monitor                    # Monitoring unique
yarn prod:monitor:continuous         # Monitoring continu
```

#### `initialize-production.ts`
Initialisation infrastructure production.

---

### 🔧 Development (`scripts/development/`)

#### `diagnostic-docker.js`
Diagnostic et analyse des conteneurs Docker.

```bash
yarn perf:docker
```

**Fonctionnalités**:
- Stats ressources conteneurs
- Logs récents
- Tests connexions DB

#### `build-docker.ps1`
Construction images Docker (dev/prod).

```powershell
.\scripts\development\build-docker.ps1
```

---

### 🛠️ Maintenance (`scripts/maintenance/`)

#### `qr-rotation-cron.ts`
Rotation automatique des QR codes (cron job).

```bash
yarn qr:rotate
```

**Utilisation**: Configurer en tâche planifiée pour sécurité QR codes.

#### `email-system-info.ts`
Informations système email.

```bash
yarn email:info
```

---

### 🔐 Security (`scripts/security/`)

#### `security-operations.ps1`
**Script PowerShell principal** pour opérations sécurité.

```powershell
.\scripts\security\security-operations.ps1 -Action deploy      # Déploiement sécurisé
.\scripts\security\security-operations.ps1 -Action monitor     # Monitoring sécurité
.\scripts\security\security-operations.ps1 -Action backup      # Backup sécurisé
```

**Fonctionnalités**:
- Déploiement avec checks sécurité
- Monitoring temps réel
- Alertes Slack/Email
- Backup automatique
- Réponse incidents

#### `test-production-security.ps1`
Tests sécurité pour production.

```powershell
.\scripts\security\test-production-security.ps1
```

**Tests effectués**:
- HTTPS/SSL
- Rate limiting
- Security headers
- CSP
- Helmet.js
- Authentication

#### `security.ts`
Outils sécurité TypeScript.

#### `pentest.py`
Tests de pénétration (Python).

**Usage**: Audits sécurité manuels

#### `test-waf-security.js`
Tests WAF (Web Application Firewall).

---

### 🧪 Testing (`scripts/testing/`)

#### `seed-test.ts` 🌱
**Seeding base de données** pour tests.

```bash
yarn db:seed            # Insérer données test
yarn db:clean           # Nettoyer données test
yarn db:reset           # Reset complet (clean + seed)
```

**Données créées**:
- 4 utilisateurs test (USER, ORGANIZER, ADMIN)
- 3 événements
- Tickets, commandes, paiements
- Reviews, notifications

**Comptes test**:
- `test1@example.com` / `test123` (USER)
- `test2@example.com` / `test123` (USER)
- `organizer@test.com` / `test123` (ORGANIZER)
- `admin@test.com` / `test123` (ADMIN)

#### `seed-dashboard-test.ts`
Données test spécifiques dashboard.

```bash
yarn db:seed:dashboard
```

#### `performance-suite.js`
Suite complète tests performance.

```bash
yarn perf:suite              # Suite standard
yarn perf:suite:full         # Suite complète
```

#### `performance-http-test.js`
Tests performance HTTP.

```bash
yarn perf:http
```

#### `performance-tests.ts`
Tests performance TypeScript.

#### `test-qr-system.ts`
Tests système QR codes.

```bash
yarn qr:test
```

**Tests**:
- Génération QR codes
- Validation codes
- Rotation sécurité

#### `test-email-templates.ts`
Tests templates email.

```bash
yarn email:test
```

**Tests**:
- Rendu templates Handlebars
- Envoi emails test
- Validation formatage

#### `test-api-routes.ts`
Tests routes API.

#### `test-middleware-auth.ts`
Tests middleware authentification.

---

## 📝 Scripts Référencés dans package.json

### Base de données
```json
"db:seed": "tsx scripts/testing/seed-test.ts seed"
"db:clean": "tsx scripts/testing/seed-test.ts clean"
"db:reset": "tsx scripts/testing/seed-test.ts reset"
"db:seed:dashboard": "tsx scripts/testing/seed-dashboard-test.ts"
```

### Tests
```json
"test:all": "node scripts/run-all-tests.js"
```

### Production
```json
"prod:setup": "yarn node scripts/deployment/quick-setup-production.js"
"prod:validate": "yarn tsx scripts/deployment/validate-production.ts"
"prod:deploy": "./scripts/deployment/deploy-production.sh production"
"prod:monitor": "yarn tsx scripts/deployment/post-deployment-monitor.ts single"
"prod:monitor:continuous": "yarn tsx scripts/deployment/post-deployment-monitor.ts continuous"
```

### Performance
```json
"perf:http": "node scripts/testing/performance-http-test.js"
"perf:docker": "node scripts/development/diagnostic-docker.js"
"perf:suite": "node scripts/testing/performance-suite.js"
"perf:suite:full": "node scripts/testing/performance-suite.js --full"
```

### Fonctionnalités
```json
"qr:test": "yarn tsx scripts/testing/test-qr-system.ts"
"qr:rotate": "yarn tsx scripts/maintenance/qr-rotation-cron.ts"
"email:test": "yarn tsx scripts/testing/test-email-templates.ts"
"email:info": "yarn tsx scripts/maintenance/email-system-info.ts"
```

---

## 🔧 Utilisation Recommandée

### Développement Local
1. **Démarrer environnement**: `.\scripts-tools.ps1` → Option 1
2. **Seed base de données**: `yarn db:reset`
3. **Tests**: `yarn test:all`

### Tests Performance
1. **Tests HTTP**: `yarn perf:http`
2. **Diagnostic Docker**: `yarn perf:docker`
3. **Suite complète**: `yarn perf:suite:full`

### Production
1. **Setup**: `yarn prod:setup`
2. **Validation**: `yarn prod:validate`
3. **Déploiement**: `yarn prod:deploy`
4. **Monitoring**: `yarn prod:monitor:continuous`

### Sécurité
1. **Tests sécurité**: `.\scripts\security\test-production-security.ps1`
2. **Opérations**: `.\scripts\security\security-operations.ps1 -Action monitor`

---

## 📚 Documentation Complémentaire

- 📖 [Guide Outils](../docs/TOOLS_GUIDE.md)
- 🚀 [Guide Déploiement](../docs/PRODUCTION_DEPLOYMENT.md)
- 🔐 [Guide Sécurité](../SECURITY.md)
- 🧪 [Guide Tests](../docs/TESTING.md)
- 📊 [Rapport Nettoyage](../SCRIPTS_CLEANUP_REPORT.md)

---

## 🗑️ Scripts Supprimés (Oct 2025)

**Total supprimé**: 20 fichiers obsolètes

### Raisons
- ✅ Scripts shell incompatibles Windows (13 fichiers)
- ✅ Doublons (1 fichier)
- ✅ Scripts non référencés (5 fichiers)
- ✅ Dossiers vides (1 dossier)

**Détails**: Voir `SCRIPTS_CLEANUP_REPORT.md`

---

## ⚠️ Notes Importantes

### Scripts Shell (.sh)
- ⚠️ Un seul script `.sh` conservé: `deployment/deploy-production.sh`
- 📝 Raison: Référencé dans package.json
- 🔄 Action recommandée: Migrer vers PowerShell

### Compatibilité
- ✅ Tous les scripts compatibles Windows PowerShell 5.1+
- ✅ Scripts TypeScript: Node.js 18+ requis
- ✅ Scripts Python: Python 3.8+ requis (pentest uniquement)

### Maintenance
- 📝 Documenter tout nouveau script dans ce README
- 🔗 Ajouter dans package.json si usage fréquent
- 🪟 Privilégier PowerShell pour scripts Windows
- 🧹 Éviter les doublons shell/PowerShell

---

**Dernière mise à jour**: 11 octobre 2025  
**Plateforme**: Windows 11 + PowerShell 5.1+  
**Status**: ✅ Structure optimisée et nettoyée
