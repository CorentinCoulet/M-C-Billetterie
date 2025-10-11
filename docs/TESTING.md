# 🧪 Guide des Tests

Ce projet utilise plusieurs frameworks de tests pour garantir la qualité du code.

## 📋 Table des matières

- [Commandes rapides](#commandes-rapides)
- [Tests Jest](#tests-jest)
- [Tests E2E Playwright](#tests-e2e-playwright)
- [Tests de mutation](#tests-de-mutation)
- [Tests de performance](#tests-de-performance)
- [CI/CD](#cicd)

## 🚀 Commandes rapides

### Lancer TOUS les tests (Jest + E2E)
```bash
yarn test:all
```
Cette commande lance :
1. Tous les tests Jest (unit, integration, API, security, etc.)
2. Tous les tests E2E Playwright

### Lancer tous les tests en CI
```bash
yarn test:all:ci
```
Lance tous les tests avec coverage et configuration CI.

---

## 🧩 Tests Jest

Jest est utilisé pour les tests unitaires, d'intégration, API, et de sécurité.

### Commandes principales

```bash
# Tous les tests Jest uniquement
yarn test

# Tests avec watch mode (re-run automatique)
yarn test:watch

# Tests avec coverage
yarn test:coverage

# Tests en mode CI
yarn test:ci
```

### Tests par catégorie

```bash
# Tests unitaires uniquement
yarn test:unit

# Tests d'intégration
yarn test:integration

# Tests API
yarn test:api

# Tests property-based
yarn test:property

# Debug mode
yarn test:debug
```

### Structure des tests Jest

```
tests/
├── unit/              # Tests unitaires
├── integration/       # Tests d'intégration
├── api/              # Tests d'API
├── security/         # Tests de sécurité
├── property-based/   # Tests property-based
├── regression/       # Tests de régression
├── snapshots/        # Tests de snapshot
└── contract/         # Tests de contrat
```

---

## 🎭 Tests E2E Playwright

Playwright est utilisé pour les tests end-to-end (navigation, interactions utilisateur).

### Commandes principales

```bash
# Lancer les tests E2E
yarn test:e2e

# Interface graphique (recommandé pour debug)
yarn test:e2e:ui

# Voir le navigateur pendant les tests
yarn test:e2e:headed

# Mode debug interactif
yarn test:e2e:debug

# Tester uniquement sur Chromium
yarn test:e2e:chromium

# Voir le rapport HTML
yarn test:e2e:report
```

### Navigateurs supportés

Les tests E2E s'exécutent sur :
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit/Safari (Desktop)
- ✅ Chrome Mobile (Pixel 5)
- ✅ Safari Mobile (iPhone 12)

### Structure des tests E2E

```
tests/e2e/
├── auth.spec.ts           # Tests d'authentification
├── critical-flows.spec.ts # Parcours critiques (achat)
└── global-setup.ts        # Configuration globale
```

---

## 🧬 Tests de mutation

Les tests de mutation vérifient la qualité de votre suite de tests.

```bash
# Tests de mutation standard
yarn test:mutation

# Tests de mutation property-based
yarn test:mutation:property

# Tests de mutation en CI
yarn test:mutation:ci
```

---

## ⚡ Tests de performance

```bash
# Tous les tests de performance
yarn perf:all

# Tests API uniquement
yarn perf:api

# Tests de base de données
yarn perf:db

# Tests de cache
yarn perf:cache

# Load testing avec Artillery
yarn perf:artillery

# Load testing extrême
yarn perf:artillery:extreme
```

---

## 🔄 CI/CD

### GitHub Actions / GitLab CI

```yaml
# Exemple de workflow CI
test:
  script:
    - yarn install --frozen-lockfile
    - yarn test:all:ci
```

### Variables d'environnement requises

Pour les tests E2E, assurez-vous que :
- ✅ L'application Next.js est lancée (port 3000)
- ✅ La base de données de test est disponible
- ✅ Les variables d'environnement sont configurées

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://...
JWT_SECRET=your-test-secret
```

---

## 📊 Coverage

Les rapports de coverage sont générés dans :
- `coverage/` - Rapports Jest
- `playwright-report/` - Rapports Playwright

### Voir le coverage Jest
```bash
yarn test:coverage
# Ouvrir coverage/lcov-report/index.html
```

---

## 🐛 Debug

### Debug Jest
```bash
# Avec VS Code
yarn test:debug

# Ou avec Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Debug Playwright
```bash
# Mode debug interactif
yarn test:e2e:debug

# Avec interface graphique
yarn test:e2e:ui
```

---

## 📈 Métriques actuelles

| Type de test | Nombre | Status |
|--------------|--------|--------|
| Tests Jest | 1277 | ✅ Passing |
| Suites Jest | 68 | ✅ Passing |
| Snapshots | 35 | ✅ Passing |
| Tests E2E | 2 suites | ⚠️ Playwright (séparé) |

---

## 💡 Bonnes pratiques

1. **Avant de commit** : Lancer `yarn test:all`
2. **En développement** : Utiliser `yarn test:watch`
3. **Pour les E2E** : Utiliser `yarn test:e2e:ui` pour débugger
4. **En CI** : Toujours utiliser `yarn test:all:ci`
5. **Coverage** : Viser >80% de couverture de code

---

## 🆘 Problèmes courants

### Les tests E2E échouent
```bash
# Vérifier que l'app tourne
yarn dev

# Vérifier dans un autre terminal
yarn test:e2e
```

### Jest est lent
```bash
# Lancer seulement les tests modifiés
yarn test:watch

# Ou limiter à un pattern
yarn test unit
```

### Problèmes de timeout
```javascript
// Augmenter le timeout dans jest.config.js
testTimeout: 30000 // 30 secondes
```

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Stryker Mutator](https://stryker-mutator.io/)

---

**Maintenu par l'équipe de développement** 🚀
