# 🔥 TODO CRITIQUE - Billetterie Project

> **Liste des tâches essentielles et critiques pour améliorer la qualité du projet**
> 
> **Date:** 10 Octobre 2025  
> **Priorité:** URGENT → IMPORTANT → NÉCESSAIRE

---

## 🔴 URGENT - À faire cette semaine

### 1. ✅ 🧹 Nettoyer le Code Dupliqué - TERMINÉ

**Problème:** Services utilisateurs dupliqués qui créent de la confusion

```bash
# Fichiers concernés
src/services/userService.ts           # ✅ Service principal unifié
src/services/userService2.ts          # ✅ Supprimé
src/services/userManagementService.ts # ✅ Supprimé
src/services/ticketQRService.ts.backup # N/A (n'existait pas)
```

**Actions:**
- [x] Analyser les différences entre les 3 services utilisateurs
- [x] Fusionner en un seul service `userService.ts` avec toutes les fonctionnalités
- [x] Supprimer `userService2.ts` et `userManagementService.ts`
- [x] Mettre à jour tous les imports dans le projet (aucun import trouvé)
- [x] Vérifier que tout fonctionne après fusion

**Impact:** 🔴 CRITIQUE - ✅ RÉSOLU - Un seul service utilisateur unifié

---

### 2. ✅ 📝 Remplacer console.log par le logger - TERMINÉ

**Problème:** 20+ console.log/error dans le code de production

```typescript
// ✅ REMPLACÉ PAR
import { logger } from '@/lib/logger';
logger.info('Starting QR code rotation');
logger.error({ error, ticketId }, 'Validation failed');
logger.warn({ eventId }, 'Validating ticket for past event');
logger.debug({ userId, permissions }, 'Checking permissions');
```

**Fichiers corrigés:**
- [x] `src/services/qrRotationService.ts` (8 console.log → logger)
- [x] `src/services/ticketService.ts` (2 console.warn/error → logger)
- [x] `src/services/ticketQRService.ts` (2 console.warn/error → logger)
- [x] `src/services/systemLogsService.ts` (2 console.log/error → logger)
- [x] `src/utils/universal-controllers.ts` (5 console.log DEBUG → logger.debug)
- [x] `src/utils/appRouterAdapter.ts` (1 console.error → logger)
- [x] `src/services/qrCodeService.ts` (2 console.error → logger)

**Impact:** 🔴 CRITIQUE - ✅ RÉSOLU - Tous les logs structurés avec Pino

---

### 3. ✅ Valider les Variables d'Environnement - TERMINÉ

**Problème:** Aucune validation au démarrage = crash en prod si config invalide

**Actions:**
- [x] Créer `src/config/env.ts` avec validation Zod complète
- [x] Valider toutes les variables critiques (DATABASE, JWT, STRIPE, EMAIL, etc.)
- [x] Ajouter validation automatique au démarrage de l'application
- [x] Mettre à jour `.env.example` avec les contraintes (32 chars min)
- [x] Créer documentation `docs/ENVIRONMENT_SETUP.md` complète
- [ ] Importer dans `next.config.js` pour validation au build (à faire)
- [ ] Remplacer progressivement `process.env.XXX` par `env.XXX` (à faire)

**Fichiers créés:**
- ✅ `src/config/env.ts` - Validation Zod avec tous les champs requis
- ✅ `docs/ENVIRONMENT_SETUP.md` - Guide complet de configuration
- ✅ `.env.example` mis à jour avec avertissements de sécurité

**Impact:** 🔴 CRITIQUE - ✅ RÉSOLU - L'app ne démarre pas avec des variables invalides

---

## 🟡 IMPORTANT - À faire ce mois-ci

### 4. 🔧 Standardiser les API Route Handlers

**Problème:** 3 patterns différents utilisés = code inconsistant

**Analyse effectuée:** ✅
- Total routes: **46**
- Standardisées (createMethodHandler): **14** (30%)
- Avec withAuth: **5** (11%)
- Pattern direct: **27** (59%) ⚠️
- Routes avec console.log: **39** (85%) ❌

**Pattern choisi:** `createMethodHandler` + helpers (withAuth, validateBody)

**Actions:**
- [x] Créer script d'analyse `scripts/analyze-api-routes.js`
- [x] Créer guide de style détaillé dans CONTRIBUTING.md
- [x] **Phase 1 - Routes critiques (auth, payments, orders):** ✅ TERMINÉ
  - [x] ✅ app/api/auth/register/route.ts (déjà standardisé)
  - [x] ✅ app/api/orders/route.ts (déjà standardisé)
  - [x] ✅ app/api/payments/route.ts (déjà standardisé)
  - [x] ✅ app/api/auth/login/route.ts
  - [x] ✅ app/api/auth/forgot-password/route.ts
  - [x] ✅ app/api/auth/change-password/route.ts
  - [x] ✅ app/api/auth/me/route.ts
  - [x] ✅ app/api/payments/webhook/route.ts
- [x] **Phase 2 - Routes importantes (tickets, events):** ✅ TERMINÉ
  - [x] ✅ app/api/tickets/route.ts (déjà standardisé)
  - [x] ✅ app/api/events/[id]/route.ts (déjà standardisé)
  - [x] ✅ app/api/tickets/validate/route.ts
  - [x] ✅ app/api/tickets/[id]/regenerate-qr/route.ts
  - [x] ✅ app/api/events/route.ts
  - [x] ✅ app/api/events/[id]/scan-stats/route.ts
  - [x] ✅ app/api/events/[id]/scanned-tickets/route.ts
- [ ] **Phase 3 - Routes secondaires (en cours)**
  - [x] ✅ app/api/dashboard/stats/route.ts
  - [x] ✅ app/api/dashboard/activities/route.ts
  - [x] ✅ app/api/admin/qr-rotation/route.ts
  - [x] ✅ app/api/cache/health/route.ts
  - [x] ✅ app/api/health/route.ts (logger ajouté)
  - [x] ✅ app/api/metrics/route.ts (logger ajouté)
  - [ ] app/api/organizations/route.ts
  - [ ] app/api/organizations/[id]/route.ts
  - [ ] app/api/organizations/[id]/members/route.ts
  - [ ] app/api/docs/route.ts
  - [ ] app/api/monitoring/sentry/route.ts
  - [ ] app/api/test/* (routes de test)
  - [ ] + 8 autres routes secondaires

**Progrès:** 33/46 routes standardisées (72%) ✨

**Impact immédiat:**
- ✅ Toutes les routes critiques d'authentification standardisées
- ✅ Webhook Stripe entièrement converti avec logs structurés
- ✅ Routes dashboard et admin avec auth et logger
- ✅ Routes monitoring/health avec logger structuré
- ✅ 50+ console.log remplacés par logger (en cours)
- ✅ Tests de sécurité mis à jour et fonctionnels
- ✅ Code cohérent et maintenable
- ⏳ Il reste 13 routes secondaires à standardiser (organisations, test, docs, etc.)

**Impact:** 🟡 IMPORTANT - Facilite la maintenance et onboarding

**Note:** Les 13 routes restantes sont principalement des routes de test, documentation, et organisations. Elles peuvent être standardisées progressivement car elles sont moins critiques.

---

### 5. 🧪 Ajouter Tests E2E Critiques

**Problème:** Pas de tests E2E = risque de régression sur parcours utilisateur

**Actions:**
- [ ] Installer Playwright: `yarn add -D @playwright/test`
- [ ] Créer `tests/e2e/` directory
- [ ] Écrire tests pour parcours critiques SEULEMENT:

```typescript
// tests/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Parcours Critique Achat', () => {
  test('acheter un billet complet', async ({ page }) => {
    // 1. Inscription
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    // ...
    
    // 2. Connexion
    await page.goto('/login');
    // ...
    
    // 3. Sélection événement
    await page.goto('/events');
    await page.click('.event-card:first-child');
    
    // 4. Achat
    await page.click('[data-testid="buy-ticket"]');
    
    // 5. Paiement Stripe (test mode)
    // ...
    
    // 6. Vérifier billet reçu
    await page.goto('/tickets');
    await expect(page.locator('.ticket-item')).toBeVisible();
  });
  
  test('valider un QR code', async ({ page }) => {
    // Test validation QR en tant qu'organisateur
    // ...
  });
});
```

**Tests E2E minimums:**
- [ ] Inscription → Connexion → Achat → Réception billet
- [ ] Validation QR code par organisateur
- [ ] Remboursement commande

**Impact:** 🟡 IMPORTANT - Prévient les bugs critiques en production

---

### 6. ✅ 🚨 Créer ErrorHandler Centralisé - TERMINÉ

**Problème:** Erreurs retournées avec structures différentes

**Actions:**
- [x] Améliorer `src/lib/errors.ts` avec codes d'erreur applicatifs
- [x] Ajouter ErrorCodes catalog complet (AUTH, TICKET, EVENT, ORDER, PAY, USER, VAL, GEN)
- [x] Créer helpers modernes (handleApiError, asyncHandler, CommonErrors)
- [x] Gestion automatique des erreurs Prisma (P2002, P2025, etc.)
- [x] Logging structuré intégré avec contexte
- [x] Documenter tous les codes d'erreur dans API_DOCUMENTATION.md

**Fichiers créés/modifiés:**
- ✅ `src/lib/errors.ts` - 400+ lignes avec 50+ codes d'erreur
- ✅ `docs/API_DOCUMENTATION.md` - Documentation complète des codes d'erreur

**Codes d'erreur disponibles:**
- AUTH_xxx: 8 codes (credentials, token, permissions)
- TICKET_xxx: 5 codes (not found, used, invalid QR)
- EVENT_xxx: 4 codes (not found, full, cancelled)
- ORDER_xxx: 4 codes (not found, paid, expired)
- PAY_xxx: 4 codes (failed, stripe, refund)
- USER_xxx: 2 codes (not found, exists)
- VAL_xxx: 1 code (validation)
- GEN_xxx: 5 codes (generic errors)

**Utilisation:**

```typescript
import { handleApiError, CommonErrors, ErrorCodes } from '@/lib/errors';

// Lancer une erreur typée
throw CommonErrors.notFound('Ticket', ticketId);

// Gérer automatiquement les erreurs
try {
  // ... code
} catch (error) {
  return handleApiError(error, { ticketId, userId });
}

// Wrapper async automatique
export const GET = asyncHandler(async (req) => {
  // ... code - erreurs gérées automatiquement
});
```

**Impact:** 🟡 IMPORTANT - ✅ RÉSOLU - Débogage précis + API cohérente

---

### 7. ⚙️ Setup CI/CD Basique

**Problème:** Pas de tests automatiques sur les PR = risque de casser main

**Actions:**
- [ ] Créer `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: billetterie_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Type check
        run: yarn type-check
      
      - name: Lint
        run: yarn lint
      
      - name: Run tests
        run: yarn test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/billetterie_test
          JWT_SECRET: test-secret-32-characters-long-minimum
          NODE_ENV: test
      
      - name: Build
        run: yarn build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

- [ ] Ajouter badge dans README.md
- [ ] Configurer branch protection rules (require CI to pass)

**Impact:** 🟡 IMPORTANT - Prévient les bugs avant merge

---

## 🟢 NÉCESSAIRE - À prévoir

### 8. 📊 Mesurer la Couverture de Tests

**Actions:**
- [ ] Exécuter: `yarn test:coverage`
- [ ] Analyser le rapport dans `coverage/lcov-report/index.html`
- [ ] Viser **80% de couverture minimum** pour:
  - Services critiques (auth, payment, ticket, qr)
  - Controllers API
  - Middlewares de sécurité
- [ ] Ajouter badge coverage dans README.md
- [ ] Configurer seuil minimum dans `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80,
  },
  './src/services/': {
    branches: 80,
    functions: 85,
    lines: 90,
    statements: 90,
  },
},
```

**Impact:** 🟢 NÉCESSAIRE - Garantit la qualité du code

---

### 9. 🚀 Optimiser le Cache Redis

**Problème:** Redis configuré mais sous-utilisé

**Actions:**
- [ ] Implémenter cache pour requêtes fréquentes:

```typescript
// src/lib/cache-helpers.ts
import { cache } from './cache';

export async function getCachedEvents() {
  const cacheKey = 'events:published:list';
  
  // Essayer le cache
  const cached = await cache.get<Event[]>(cacheKey);
  if (cached) return cached;
  
  // Si pas en cache, récupérer de la DB
  const events = await prisma.event.findMany({
    where: { isPublished: true },
  });
  
  // Mettre en cache pour 5 minutes
  await cache.set(cacheKey, events, 300);
  
  return events;
}

// Invalider le cache quand un event change
export async function invalidateEventCache(eventId: string) {
  await cache.del('events:published:list');
  await cache.del(`event:${eventId}`);
}
```

- [ ] Cacher les événements publics (5 min)
- [ ] Cacher les catégories (1 heure)
- [ ] Cacher les statistiques dashboard (2 min)
- [ ] Invalider le cache lors des updates

**Impact:** 🟢 NÉCESSAIRE - Réduit la charge DB de 50-70%

---

### 10. 📖 Compléter Swagger/OpenAPI

**Problème:** Swagger configuré mais endpoints non documentés

**Actions:**
- [ ] Ajouter annotations JSDoc sur toutes les routes API:

```typescript
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Liste des événements
 *     description: Récupère tous les événements publiés
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de page
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
export async function GET(req: NextRequest) { }
```

- [ ] Documenter routes critiques:
  - `/api/auth/*` (login, register, etc.)
  - `/api/events/*`
  - `/api/orders/*`
  - `/api/tickets/*`
  - `/api/payments/*`

**Impact:** 🟢 NÉCESSAIRE - Facilite l'utilisation de l'API

---

## ✅ CHECKLIST DE VALIDATION

Avant de considérer ces tâches comme terminées:

### Code Quality
- [ ] Aucun doublon de service dans le projet
- [ ] Aucun `console.log` dans `src/` (sauf logger Pino)
- [ ] Variables d'env validées au démarrage
- [ ] Pattern API uniforme sur toutes les routes

### Tests
- [ ] Coverage > 80% pour services critiques
- [ ] Tests E2E passent pour parcours achat
- [ ] CI/CD exécute tous les tests sur PR

### Production Ready
- [ ] ErrorHandler centralisé utilisé partout
- [ ] Cache Redis sur requêtes fréquentes
- [ ] API documentée dans Swagger

---

## 📊 MÉTRIQUES DE SUCCÈS

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Services dupliqués | 3 user services | 1 service unifié |
| Console.log en prod | ~20 | 0 |
| Coverage tests | ? | 80%+ |
| Temps build CI | N/A | < 5 min |
| Cache hit ratio | 0% | 60%+ |
| API docs completude | ~30% | 80%+ |

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Semaine 1** : Tâches 1, 2, 3 (URGENT) ⚠️
2. **Semaine 2** : Tâches 4, 5 (IMPORTANT)
3. **Semaine 3** : Tâches 6, 7 (IMPORTANT)
4. **Semaine 4** : Tâches 8, 9, 10 (NÉCESSAIRE)

---

## 💡 NOTES

- **Ne pas tout faire d'un coup** - Prioriser et avancer par étapes
- **Tester après chaque changement** - Un bug introduit est pire qu'un TODO
- **Commiter régulièrement** - Petits commits avec messages clairs
- **Demander review** - Les changements critiques doivent être validés

---

**🚀 Focus sur ces 10 tâches critiques, le reste peut attendre !**

*Dernière mise à jour: 10 Octobre 2025*
