# E2E Tests with Playwright 🎭

This folder contains the End-to-End (E2E) tests for the ticketing application, using Playwright.

## 📊 Current Test Status (2025-11-24)

### ✅ Active Tests (3)
- `registration with non-matching passwords` - Validates password matching
- `XSS in form fields is escaped` - Security validation
- `redirect to login if not authenticated` - Protected routes

### ⏭️ Skipped Tests (9)
These tests are temporarily disabled while features are being developed/fixed:

**auth.spec.ts** (8 tests):
- `registration with existing email shows error`
- `login with valid credentials`
- `login with invalid email`
- `login with incorrect password`
- `logout works correctly`
- `forgot password sends reset email`
- `accessing protected page without auth redirects to login`
- `multiple failed login attempts trigger rate limiting`

**critical-flows.spec.ts** (1 test):
- `login with invalid credentials shows error`

> 💡 **Note**: Skipped tests will be re-enabled progressively as the corresponding features are fixed.

## 📋 Table of Contents

- [Test Structure](#test-structure)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Fixtures and Helpers](#fixtures-and-helpers)
- [Best Practices](#best-practices)
- [Debugging](#debugging)

## 📁 Test Structure

```
tests/e2e/
├── fixtures.ts              # Reusable fixtures and helpers
├── critical-flows.spec.ts   # Critical flow tests (purchase, validation)
├── auth.spec.ts             # Authentication tests
└── README.md                # This file
```

## 🚀 Installation

Playwright dependencies are already installed. To install browsers:

```bash
yarn playwright install
```

To install a specific browser:

```bash
yarn playwright install chromium
yarn playwright install firefox
yarn playwright install webkit
```

## ▶️ Running Tests

### All E2E Tests

```bash
yarn test:e2e
```

### Tests with Interactive UI

```bash
yarn test:e2e:ui
```

### Tests in Headed Mode (see browser)

```bash
yarn test:e2e:headed
```

### Tests on a Specific Browser

```bash
yarn test:e2e:chromium   # Chrome/Chromium only
yarn test:e2e --project=firefox
yarn test:e2e --project=webkit
```

### A Specific Test File

```bash
yarn test:e2e critical-flows.spec.ts
yarn test:e2e auth.spec.ts
```

### Interactive Debug Mode

```bash
yarn test:e2e:debug
```

### View HTML Report

```bash
yarn test:e2e:report
```

## ✍️ Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('my feature', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('h1')).toHaveText('Success');
});
```

### With Custom Fixtures

```typescript
import { test, expect } from './fixtures';

test('buy a ticket', async ({ page, auth, events, testUser }) => {
  // Auto login with fixture
  await auth.registerAndLogin(testUser);
  
  // Use helpers
  const eventId = await events.selectFirstEvent();
  await events.buyTicket();
  
  // Assertions
  await expect(page).toHaveURL(/\/success/);
});
```

## 🛠️ Fixtures and Helpers

### AuthHelpers

```typescript
// Registration and login
await auth.registerAndLogin(testUser);

// Simple login
await auth.login('email@example.com', 'password');

// Logout
await auth.logout();

// Check if logged in
const isLoggedIn = await auth.isLoggedIn();
```

### EventHelpers

```typescript
// Navigate to events
await events.goToEvents();

// Select first event
const eventId = await events.selectFirstEvent();

// Buy a ticket
await events.buyTicket();
```

### TicketHelpers

```typescript
// Go to tickets page
await tickets.goToTickets();

// Count tickets
const count = await tickets.getTicketCount();

// Check for QR code presence
const hasQR = await tickets.hasQRCode(0);
```

### PaymentHelpers

```typescript
// Fill Stripe test card
await payment.fillTestCard();

// Submit payment
await payment.submitPayment();
```

### TestUtils

```typescript
import { TestUtils } from './fixtures';

// Generate unique test user
const user = TestUtils.generateTestUser();

// Wait for page to stabilize
await TestUtils.waitForStableNavigation(page);

// Screenshot with annotations
await TestUtils.takeAnnotatedScreenshot(page, 'step-1', [
  { text: 'Click here', x: 100, y: 200 }
]);
```

## ✅ Best Practices

### 1. Use Stable Selectors

```typescript
// ✅ GOOD - data-testid
await page.click('[data-testid="buy-button"]');

// ✅ GOOD - role + name
await page.click('button:has-text("Buy")');

// ❌ BAD - fragile CSS class
await page.click('.btn-primary-v2');
```

### 2. Wait Explicitly

```typescript
// ✅ GOOD
await expect(page.locator('.ticket')).toBeVisible({ timeout: 10000 });

// ❌ BAD - fixed timeout
await page.waitForTimeout(5000);
```

### 3. Isolate Tests

```typescript
test.beforeEach(async ({ page }) => {
  // Each test starts clean
  await page.goto('/');
});

// Use unique data
const timestamp = Date.now();
const email = `test-${timestamp}@example.com`;
```

### 4. Use test.step for Clarity

```typescript
test('complete flow', async ({ page }) => {
  await test.step('Registration', async () => {
    // ...
  });
  
  await test.step('Purchase', async () => {
    // ...
  });
});
```

### 5. Handle Errors

```typescript
// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Console error:', msg.text());
  }
});

// Capture failed requests
page.on('requestfailed', request => {
  console.error('Failed request:', request.url());
});
```

## 🐛 Debugging

### 1. Interactive Debug Mode

```bash
yarn test:e2e:debug
```

### 2. See Tests Running

```bash
yarn test:e2e:headed
```

### 3. UI Mode (recommended)

```bash
yarn test:e2e:ui
```

### 4. Screenshots and Traces

```typescript
// Automatic screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full trace (automatically enabled on failure)
// See in playwright-report/
```

### 5. Pause in a Test

```typescript
await page.pause(); // Opens Playwright inspector
```

### 6. Debug Logs

```bash
DEBUG=pw:api yarn test:e2e
```

# 🧪 Tests E2E - Guide Complet

Ce guide explique comment configurer et exécuter les tests End-to-End (E2E) avec Playwright.

## 📋 Prérequis

### Services requis
- ✅ **PostgreSQL** : Base de données
- ✅ **Redis** : Cache (optionnel mais recommandé)
- ✅ **Node.js** : v18 ou supérieur
- ✅ **Yarn** : Gestionnaire de paquets

### Installation rapide des services (Ubuntu/WSL)
```bash
# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Redis
sudo apt install redis-server

# Démarrer les services
sudo service postgresql start
sudo service redis-server start
```

## 🚀 Configuration Rapide (3 étapes)

### Étape 1 : Créer la base de données de test
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données
CREATE DATABASE billetterie_test;

# Quitter
\q
```

### Étape 2 : Lancer le script de setup
```bash
# Rendre le script exécutable
chmod +x scripts/testing/setup-e2e.sh

# Lancer le setup
./scripts/testing/setup-e2e.sh
```

Ce script va :
- ✅ Vérifier tous les prérequis
- ✅ Créer/vérifier la base de données
- ✅ Installer les dépendances
- ✅ Générer le client Prisma
- ✅ Appliquer les migrations
- ✅ Seed les données de test

### Étape 3 : Lancer les tests
```bash
# Tous les tests
yarn test:e2e

# Mode UI interactif (recommandé pour le développement)
yarn test:e2e:ui

# Avec navigateur visible
yarn test:e2e:headed

# Mode debug
yarn test:e2e:debug

# Un seul navigateur (plus rapide)
yarn test:e2e:chromium
```

## 📝 Configuration Manuelle (Alternative)

Si le script automatique ne fonctionne pas, voici les étapes manuelles :

### 1. Créer le fichier `.env.test`
Le fichier existe déjà à la racine du projet. Vérifiez qu'il contient :
```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/billetterie_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-jwt-32-characters-long-minimum-for-security
# ... (voir le fichier complet)
```

### 2. Créer la base de données
```bash
sudo -u postgres psql -c "CREATE DATABASE billetterie_test;"
```

### 3. Installer les dépendances
```bash
yarn install
npx playwright install chromium
```

### 4. Configurer Prisma
```bash
yarn db:generate
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:migrate:deploy
```

### 5. Seed les données
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:seed
```

## 🔍 Vérification de l'environnement

### Vérifier que tout fonctionne
```bash
# PostgreSQL
pg_isready -h localhost -p 5432

# Redis
redis-cli ping

# Base de données existe
psql -U postgres -c "\l" | grep billetterie_test
```

## 🐛 Résolution des problèmes

### Problème : "PostgreSQL n'est pas démarré"
```bash
sudo service postgresql start
sudo service postgresql status
```

### Problème : "Base de données n'existe pas"
```bash
# Supprimer et recréer
sudo -u postgres psql -c "DROP DATABASE IF EXISTS billetterie_test;"
sudo -u postgres psql -c "CREATE DATABASE billetterie_test;"

# Réappliquer les migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:migrate:deploy
```

### Problème : "Timeout lors des tests"
Le serveur Next.js ne démarre peut-être pas correctement. Vérifiez :
```bash
# Lancer manuellement le serveur avec l'env de test
export $(grep -v '^#' .env.test | xargs)
yarn dev

# Dans un autre terminal, lancer les tests
yarn test:e2e
```

### Problème : "Error: Cannot find module '@prisma/client'"
```bash
yarn db:generate
```

### Problème : "Navigateurs Playwright non installés"
```bash
npx playwright install chromium
```

## 📊 Structure des tests

```
tests/e2e/
├── auth.spec.ts          # Tests d'authentification
├── events.spec.ts        # Tests des événements
├── tickets.spec.ts       # Tests de billetterie
├── global-setup.ts       # Configuration globale
└── README.md            # Ce fichier
```

## 🎯 Commandes utiles

### Développement
```bash
# Mode interactif (meilleur pour débugger)
yarn test:e2e:ui

# Avec navigateur visible
yarn test:e2e:headed

# Un test spécifique
yarn test:e2e -g "registration with valid data"

# Un fichier spécifique
yarn test:e2e tests/e2e/auth.spec.ts
```

### Debugging
```bash
# Mode debug avec pause
yarn test:e2e:debug

# Voir les rapports
yarn test:e2e:report

# Générer des traces
yarn test:e2e --trace on
```

### Nettoyage
```bash
# Nettoyer la base de test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:clean

# Re-seed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:seed

# Reset complet
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:reset
```

## 🔐 Données de test disponibles

Après le seed, vous avez accès à ces comptes de test :

### Administrateur
| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | AdminDemo123! | ADMIN |

### Organisateurs  
| Email | Password | Role |
|-------|----------|------|
| music.events@demo.com | OrganizerDemo123! | ORGANIZER |
| sports.manager@demo.com | OrganizerDemo123! | ORGANIZER |
| tech.conferences@demo.com | OrganizerDemo123! | ORGANIZER |
| culture.events@demo.com | OrganizerDemo123! | ORGANIZER |

### Utilisateurs
| Email | Password | Role |
|-------|----------|------|
| alice.martin@demo.com | UserDemo123! | USER |
| bob.dubois@demo.com | UserDemo123! | USER |
| claire.bernard@demo.com | UserDemo123! | USER |
| david.petit@demo.com | UserDemo123! | USER |
| emma.durand@demo.com | UserDemo123! | USER |

📝 **Voir le détail complet** : [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md)

## 📈 Configuration CI/CD

Pour les tests en CI (GitHub Actions, GitLab CI, etc.) :

```yaml
# .github/workflows/e2e-tests.yml
- name: Setup Database
  run: |
    sudo systemctl start postgresql
    sudo -u postgres psql -c "CREATE DATABASE billetterie_test;"
    
- name: Run migrations
  run: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:migrate:deploy
  
- name: Run E2E tests
  run: yarn test:e2e
```

## 💡 Bonnes pratiques

1. **Toujours utiliser des emails uniques** avec timestamp dans les tests
2. **Nettoyer après les tests** si nécessaire
3. **Utiliser le mode UI** pour développer de nouveaux tests
4. **Augmenter les timeouts** si le serveur est lent
5. **Vérifier les screenshots** en cas d'échec

## 📚 Documentation

- [Playwright Documentation](https://playwright.dev)
- [Guide de tests E2E](../../docs/TESTING_GUIDE.md)
- [API Documentation](../../docs/API_DOCUMENTATION.md)

## ✅ Checklist avant de lancer les tests

- [ ] PostgreSQL est démarré
- [ ] Redis est démarré (optionnel)
- [ ] La base `billetterie_test` existe
- [ ] Le fichier `.env.test` est présent
- [ ] Les migrations sont appliquées
- [ ] Les dépendances sont installées
- [ ] Les navigateurs Playwright sont installés

Si tout est ✅, lancez simplement : `yarn test:e2e` 🚀
