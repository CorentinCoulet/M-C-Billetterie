# Configuration des Variables d'Environnement

Ce projet utilise une validation stricte des variables d'environnement pour garantir la sécurité et la stabilité en production.

## 🚨 Variables Critiques

### Secrets de Sécurité (32 caractères minimum REQUIS)

Les variables suivantes **DOIVENT** avoir au moins 32 caractères pour des raisons de sécurité cryptographique :

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `AES_SECRET`

### Génération de Secrets Sécurisés

Utilisez cette commande pour générer des secrets cryptographiquement sûrs :

```bash
# Générer un secret de 32 bytes (64 caractères hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou en PowerShell :
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 Configuration Requise

### Variables Obligatoires

1. **Base de données**
   - `DATABASE_URL` : URL PostgreSQL valide (commence par `postgresql://`)

2. **Sécurité**
   - `JWT_SECRET` : Secret JWT (min 32 caractères)
   - `JWT_REFRESH_SECRET` : Secret refresh token (min 32 caractères)
   - `ENCRYPTION_KEY` : Clé de chiffrement (min 32 caractères)
   - `AES_SECRET` : Clé AES (min 32 caractères)

3. **Stripe (Paiements)**
   - `STRIPE_SECRET_KEY` : Commence par `sk_test_` ou `sk_live_`
   - `STRIPE_WEBHOOK_SECRET` : Commence par `whsec_`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : Commence par `pk_test_` ou `pk_live_`

4. **Email (SMTP)**
   - `EMAIL_HOST` : Serveur SMTP (ex: smtp.gmail.com)
   - `EMAIL_PORT` : Port SMTP (ex: 587)
   - `EMAIL_USER` : Adresse email valide
   - `EMAIL_PASSWORD` : Mot de passe de l'application
   - `EMAIL_FROM` : Adresse email d'envoi valide

5. **Application**
   - `NEXT_PUBLIC_APP_URL` : URL complète de l'application

### Variables Optionnelles

- `REDIS_URL` : URL Redis pour le cache
- `NEXT_PUBLIC_SENTRY_DSN` : URL Sentry pour le monitoring
- `QR_CODE_SIZE` : Taille des QR codes (défaut: 200)
- `QR_CODE_MARGIN` : Marge des QR codes (défaut: 4)
- `RATE_LIMIT_MAX` : Limite de requêtes (défaut: 100)
- `RATE_LIMIT_WINDOW_MS` : Fenêtre de rate limiting (défaut: 900000 = 15 min)

## 🔍 Validation Automatique

Le fichier `src/config/env.ts` valide automatiquement toutes les variables d'environnement au démarrage de l'application.

### Comment ça marche

```typescript
import { env } from '@/config/env';

// Utiliser env au lieu de process.env
const dbUrl = env.DATABASE_URL; // ✅ Validé et typé
const jwtSecret = env.JWT_SECRET; // ✅ Validé et typé
```

### Erreurs de Validation

Si une variable est manquante ou invalide, l'application **ne démarrera pas** et affichera des erreurs claires :

```
❌ Invalid environment variables:
  - JWT_SECRET: String must contain at least 32 character(s)
  - DATABASE_URL: Invalid url
  - STRIPE_SECRET_KEY: String must start with "sk_"
```

## 🔧 Setup Initial

1. Copier le fichier d'exemple :
```bash
cp .env.example .env
```

2. Générer les secrets :
```bash
# Générer tous les secrets nécessaires
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('AES_SECRET=' + crypto.randomBytes(32).toString('hex'));
"
```

3. Remplir les autres variables dans `.env`

4. Tester la validation :
```bash
yarn build
# Si tout est OK : ✅ Environment variables validated successfully
# Si erreur : ❌ Invalid environment variables: ...
```

---

## 🚀 Modes de Développement

Le projet offre plusieurs modes de développement adaptés à différents besoins :

### 1. Mode Standard (`yarn dev`)

**Quand l'utiliser** : Développement local standard

```bash
yarn dev
```

- ✅ Démarre Next.js sur `http://localhost:3000`
- ✅ Hot reload activé
- ✅ Fast Refresh React
- ✅ TypeScript watch mode
- ✅ ESLint désactivé pour plus de rapidité

**Configuration** : Utilise `.env` local

---

### 2. Mode Docker (`yarn dev:docker`)

**Quand l'utiliser** : Développement en environnement conteneurisé

```bash
yarn dev:docker
```

- ✅ Démarre Next.js sur `0.0.0.0:3001` (accessible depuis Docker)
- ✅ Compatible avec `docker-compose.dev.yml`
- ✅ Hot reload activé avec polling pour Docker
- ✅ Accès depuis l'hôte et d'autres containers

**Configuration** : 
- Port : `3001` (pour ne pas conflictuer avec le mode standard)
- Host : `0.0.0.0` (écoute sur toutes les interfaces)

**Démarrage complet avec Docker** :
```bash
# Démarrer tous les services (app + PostgreSQL + Redis + Mailhog)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Voir les logs en temps réel
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web-dev
```

---

### 3. Mode Turbo (`yarn dev:turbo`)

**Quand l'utiliser** : Développement ultra-rapide (expérimental)

```bash
yarn dev:turbo
```

- ⚡ Utilise Turbopack (remplaçant de Webpack)
- ⚡ Compilation jusqu'à 10x plus rapide
- ⚡ Hot reload quasi-instantané
- ⚠️ Expérimental (peut avoir des bugs)

**Note** : Certaines fonctionnalités peuvent ne pas être compatibles avec Turbopack.

---

### 4. Mode Debug (`yarn dev:debug`)

**Quand l'utiliser** : Débugger avec Chrome DevTools ou VS Code

```bash
yarn dev:debug
```

- 🔍 Active l'inspecteur Node.js
- 🔍 Accessible via `chrome://inspect` dans Chrome
- 🔍 Breakpoints, profiling, heap snapshots
- 🔍 Port de debug : `9229`

**Utilisation avec VS Code** :

Créez `.vscode/launch.json` :
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Debug Next.js",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Puis :
1. Lancez `yarn dev:debug`
2. Appuyez sur `F5` dans VS Code
3. Placez des breakpoints dans votre code

---

### Comparaison des Modes

| Mode | Port | Vitesse | Stabilité | Usage |
|------|------|---------|-----------|-------|
| **Standard** | 3000 | ⚡⚡⚡ | ✅✅✅ | Développement quotidien |
| **Docker** | 3001 | ⚡⚡ | ✅✅✅ | Tests d'intégration, environnement isolé |
| **Turbo** | 3000 | ⚡⚡⚡⚡⚡ | ⚠️⚠️ | Développement rapide (expérimental) |
| **Debug** | 3000 (+ 9229) | ⚡⚡ | ✅✅✅ | Débogage approfondi |

---

### Recommandations par Scénario

#### 🎯 Développement Frontend
```bash
yarn dev  # Mode standard, rapide et stable
```

#### 🎯 Tests d'Intégration
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
# Tous les services (DB, Redis, Email) sont disponibles
```

#### 🎯 Débogage d'un Bug Complexe
```bash
yarn dev:debug  # Avec Chrome DevTools ou VS Code
```

#### 🎯 Performance Maximale
```bash
yarn dev:turbo  # Compilation ultra-rapide (attention : expérimental)
```

---

### Ports Utilisés

| Service | Mode Standard | Mode Docker |
|---------|---------------|-------------|
| Application | 3000 | 3001 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |
| Mailhog Web UI | - | 8025 |
| Mailhog SMTP | - | 1025 |
| Debug Port | 9229 | 9229 |

---

### Variables d'Environnement par Mode

Toutes les modes utilisent le fichier `.env`, mais certains comportements changent :

```env
# Pour le mode Docker
NODE_ENV=development
HOSTNAME=0.0.0.0

# Pour le mode standard
NODE_ENV=development
HOSTNAME=localhost

# Pour tous les modes
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## ⚠️ Sécurité

### ❌ À NE JAMAIS FAIRE

```env
# ❌ Trop court (moins de 32 caractères)
JWT_SECRET=mysecret

# ❌ Secret par défaut
JWT_SECRET=your_jwt_secret_key_32_chars_minimum_change_this

# ❌ Commiter le .env dans git
git add .env  # DANGER!
```

### ✅ Bonnes Pratiques

```env
# ✅ Secret généré aléatoirement de 64 caractères
JWT_SECRET=a3f5e9d8c2b1a0f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4

# ✅ Secrets différents par environnement
# dev/.env : jwt_secret_dev_xxx
# prod/.env : jwt_secret_prod_yyy
```

## 📦 En Production

### Checklist de Déploiement

- [ ] Tous les secrets générés avec `crypto.randomBytes(32)`
- [ ] Secrets différents de l'environnement de développement
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` avec SSL activé
- [ ] Clés Stripe en mode live (`sk_live_`, `pk_live_`)
- [ ] SMTP configuré avec des vrais credentials
- [ ] `NEXT_PUBLIC_APP_URL` avec HTTPS
- [ ] Rate limiting ajusté pour le trafic de production
- [ ] Sentry configuré pour le monitoring
- [ ] Redis configuré avec mot de passe

## 🧪 Tests

Pour tester avec des variables d'environnement spécifiques aux tests :

```bash
# Créer .env.test
cp .env.example .env.test

# Remplir avec des valeurs de test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/billetterie_test
JWT_SECRET=test_jwt_secret_32_chars_minimum_for_testing_only
# ...
```

## 🆘 Aide

### Erreur : "JWT_SECRET must be at least 32 characters"

**Solution** : Générez un nouveau secret :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copiez le résultat dans votre `.env`

### Erreur : "DATABASE_URL must be a PostgreSQL connection string"

**Solution** : Vérifiez le format :
```env
DATABASE_URL=postgresql://username:password@host:5432/database
```

### Erreur : "STRIPE_SECRET_KEY must start with sk_"

**Solution** : Vérifiez que vous utilisez une vraie clé Stripe :
- Test : `sk_test_...`
- Live : `sk_live_...`

## 📚 Ressources

- [Documentation Zod (validation)](https://zod.dev/)
- [Variables d'environnement Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [Bonnes pratiques sécurité Node.js](https://github.com/goldbergyoni/nodebestpractices)
