# CI/CD Pipeline 🚀

Cette documentation décrit le pipeline CI/CD configuré avec GitHub Actions pour le projet de billetterie.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Jobs du pipeline](#jobs-du-pipeline)
- [Configuration](#configuration)
- [Badges](#badges)
- [Secrets requis](#secrets-requis)
- [Branch protection](#branch-protection)

## 🔍 Vue d'ensemble

Le pipeline CI/CD s'exécute automatiquement sur :
- **Push** vers les branches `main` et `develop`
- **Pull Requests** vers ces mêmes branches

### Durée approximative

- ⚡ Lint & Type Check: ~2 min
- 🧪 Tests unitaires/intégration: ~5 min
- 🎭 Tests E2E: ~8 min
- 🏗️ Build: ~3 min
- **Total: ~15-20 minutes**

## 🔧 Jobs du pipeline

### 1️⃣ Lint & Type Check (🔍)

**Objectif:** Vérifier la qualité du code et les types TypeScript

```yaml
- ESLint (yarn lint)
- TypeScript type check (yarn type-check)
```

**Échoue si:**
- Erreurs de lint
- Erreurs de types TypeScript

### 2️⃣ Tests Unitaires & Intégration (🧪)

**Objectif:** Exécuter tous les tests Jest avec couverture

**Services:**
- PostgreSQL 16
- Redis 7

**Tests exécutés:**
- Tests unitaires (`tests/unit/`)
- Tests d'intégration (`tests/integration/`)
- Tests API (`tests/api/`)
- Tests property-based (`tests/property-based/`)

**Résultats:**
- Rapport de couverture uploadé sur Codecov
- Minimum requis: 80% de couverture

### 3️⃣ Tests E2E Playwright (🎭)

**Objectif:** Tester les parcours utilisateur complets

**Services:**
- PostgreSQL 16
- Redis 7

**Navigateurs testés:**
- Chromium (en CI)
- Firefox, WebKit, Mobile (en local)

**Tests exécutés:**
- Parcours d'inscription/connexion
- Achat de billets
- Validation QR code
- Tests de sécurité

**Artefacts:**
- Rapport HTML Playwright
- Screenshots sur échec
- Vidéos sur échec
- Traces de débogage

### 4️⃣ Security Audit (🔒)

**Objectif:** Détecter les vulnérabilités de sécurité

**Outils:**
- `yarn audit` - Audit des dépendances npm
- Snyk - Scan de vulnérabilités avancé

**Seuil:** Vulnérabilités `high` et `critical` uniquement

### 5️⃣ Build Test (🏗️)

**Objectif:** S'assurer que l'application se construit correctement

```yaml
- Génération Prisma Client
- Build Next.js en mode production
- Upload de .next/ en artefact
```

**Échoue si:**
- Erreurs de build
- Bundle trop volumineux
- Dépendances manquantes

### 6️⃣ Mutation Testing (🧬)

**Objectif:** Vérifier la qualité des tests avec Stryker

**Quand:** Uniquement sur push vers `main` (économie de ressources)

**Configuration:**
- Stryker Mutator
- Minimum 80% mutation score

### 7️⃣ Status Check (✅/❌)

**Objectif:** Synthèse finale du pipeline

- ✅ `ci-success` si tous les jobs passent
- ❌ `ci-failure` si un job échoue

## ⚙️ Configuration

### Variables d'environnement (CI)

Les tests en CI utilisent des valeurs de test sécurisées :

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/billetterie_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-jwt-32-characters-long-minimum-for-security
JWT_REFRESH_SECRET=test-refresh-secret-jwt-32-characters-minimum
NEXTAUTH_SECRET=test-nextauth-secret-32-characters-long-for-security
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=test
```

### Caching

Le pipeline utilise le cache Yarn pour accélérer l'installation :

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'yarn'
```

### Concurrency

Pour économiser les ressources, une seule exécution par branche :

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## 📊 Badges

Ajoutez ces badges au README.md principal :

```markdown
![CI/CD](https://github.com/CorentinCoulet/M-C-Billetterie/workflows/CI/CD%20Pipeline/badge.svg)
![Coverage](https://codecov.io/gh/CorentinCoulet/M-C-Billetterie/branch/main/graph/badge.svg)
![Security](https://snyk.io/test/github/CorentinCoulet/M-C-Billetterie/badge.svg)
```

## 🔐 Secrets requis

Configurez ces secrets dans GitHub Settings → Secrets and variables → Actions :

### Obligatoires

| Secret | Description | Où le trouver |
|--------|-------------|---------------|
| `SNYK_TOKEN` | Token d'authentification Snyk | [snyk.io](https://snyk.io) → Settings → API Token |

### Optionnels (pour CD)

| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Token Codecov (si repo privé) |
| `VERCEL_TOKEN` | Pour déploiement Vercel automatique |
| `DOCKER_USERNAME` | Pour push d'images Docker |
| `DOCKER_PASSWORD` | Mot de passe Docker Hub |

### Comment ajouter un secret

1. Aller sur le repo GitHub
2. Settings → Secrets and variables → Actions
3. Cliquer "New repository secret"
4. Nom: `SNYK_TOKEN`
5. Value: Copier depuis Snyk
6. Cliquer "Add secret"

## 🛡️ Branch Protection

Pour protéger les branches principales, configurez les règles suivantes :

### GitHub Settings → Branches → Add branch protection rule

**Pour `main` et `develop`:**

```yaml
Branch name pattern: main

☑️ Require a pull request before merging
  ☑️ Require approvals (1)
  ☑️ Dismiss stale PR approvals when new commits are pushed

☑️ Require status checks to pass before merging
  ☑️ Require branches to be up to date before merging
  
  Status checks required:
  - 🔍 Lint & Type Check
  - 🧪 Unit & Integration Tests  
  - 🎭 E2E Tests (Playwright)
  - 🏗️ Build Application
  - ✅ CI Success

☑️ Require conversation resolution before merging

☑️ Do not allow bypassing the above settings
```

## 🚨 Troubleshooting

### Les tests échouent en CI mais pas en local

**Cause:** Différences d'environnement

**Solutions:**
1. Vérifier les variables d'environnement
2. S'assurer que la DB de test est propre
3. Vérifier les versions Node/Yarn
4. Tester avec `yarn test:ci` en local

### Timeout sur les tests E2E

**Cause:** Tests trop lents ou serveur ne démarre pas

**Solutions:**
1. Augmenter `timeout-minutes: 30` dans le job
2. Vérifier que le serveur démarre correctement
3. Optimiser les tests lents avec `test.slow()`
4. Utiliser `--project=chromium` uniquement en CI

### Erreurs de build en CI

**Cause:** Variables d'environnement manquantes

**Solutions:**
1. Vérifier que toutes les variables sont définies dans le workflow
2. Utiliser des valeurs "fake" sécurisées pour le build
3. Vérifier `next.config.js` pour les variables requises

### Security audit échoue

**Cause:** Vulnérabilités détectées dans les dépendances

**Solutions:**
1. Lancer `yarn audit` en local
2. Mettre à jour les dépendances vulnérables : `yarn upgrade package-name`
3. Si pas de fix disponible, évaluer le risque et possiblement continuer avec `continue-on-error: true`

## 📈 Métriques & Monitoring

### Codecov

Voir la couverture de code détaillée sur [codecov.io](https://codecov.io)

**Objectifs:**
- Global: 80%+
- Services critiques: 90%+
- Routes API: 85%+

### Playwright Report

Les rapports E2E sont uploadés en artefacts GitHub :

1. Aller dans l'exécution du workflow
2. Scrollez en bas → "Artifacts"
3. Télécharger `playwright-report`
4. Ouvrir `index.html` dans un navigateur

### GitHub Actions Insights

Voir les statistiques d'exécution :

1. Repo → Actions tab
2. Voir les temps d'exécution
3. Identifier les jobs lents
4. Optimiser si nécessaire

## 🔄 Workflow de développement

### Processus recommandé

```bash
# 1. Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# 2. Développer et tester localement
yarn test
yarn test:e2e
yarn lint
yarn type-check

# 3. Commit et push
git add .
git commit -m "feat: ma fonctionnalité"
git push origin feature/ma-fonctionnalite

# 4. Créer une Pull Request
# → Le pipeline CI se lance automatiquement

# 5. Une fois les checks verts ✅
# → Merge vers main/develop
```

### Pre-commit hooks (recommandé)

Installez Husky pour vérifier avant chaque commit :

```bash
yarn add -D husky lint-staged

# .husky/pre-commit
yarn lint-staged

# .lintstagedrc.js
module.exports = {
  '*.{ts,tsx}': ['yarn lint:fix', 'yarn type-check'],
  '*.{ts,tsx,js,jsx}': ['yarn test --findRelatedTests --passWithNoTests'],
};
```

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Jest Coverage](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Codecov Guide](https://docs.codecov.com/docs)

---

**Note:** Ce pipeline est conçu pour garantir la qualité du code avant chaque merge. Il est essentiel que tous les checks passent au vert ✅ avant de merger une PR.
