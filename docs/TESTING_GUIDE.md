### Stratégie de tests et exécution unifiée

Ce document présente l’état des lieux des tests existants et la manière de lancer une batterie complète pour valider les fonctionnalités, l’affichage et les performances du site.

---

#### 1. Panorama des tests existants

- Tests unitaires et d’intégration (Jest)
  - Dossiers: tests/unit, tests/integration, tests/api, tests/property-based
  - Couverture activable via Jest
  - Tests de sécurité avancés présents sous tests/security
- Tests E2E (Playwright)
  - Validation des parcours utilisateurs et de l’affichage (rendu, navigation, autorisations)
  - Rapports Playwright disponibles via playwright show-report
- Tests de performance
  - Orchestrés via scripts/testing/performance-runner.js
  - Scénarios: HTTP, diagnostics Docker, Artillery (charge, stress, capacité)
- Mutation testing (Stryker)
  - Pour évaluer la robustesse de la base de tests Jest

---

#### 2. Orchestrateur unifié

Un script unifié exécute en séquence:
- Lint (ESLint)
- Type-check (TypeScript)
- Jest (unit, intégration, API, sécurité, propriété)
- Playwright (E2E)
- Performance (mode rapide par défaut, complet sur demande)

Commandes disponibles (package.json):
- Lancer tout rapidement: yarn run:all
- Mode complet (couverture + perf complète): yarn run:all:full
- CI (couverture, sans perf): yarn run:ci

Options CLI supportées par le script:
- --full: active le mode complet (couverture + perf complète)
- --coverage: force la couverture Jest
- --skip-lint, --skip-types, --skip-perf: pour sauter certaines étapes

---

#### 3. Commandes utiles (granulaires)

- Lint et type-check
  - yarn lint
  - yarn type-check
- Jest
  - yarn test (tous les tests)
  - yarn test:unit, yarn test:integration, yarn test:api
  - yarn test:coverage (avec rapport de couverture)
- Playwright (E2E)
  - yarn test:e2e
  - yarn test:e2e:ui (UI runner)
  - yarn test:e2e:report (afficher le rapport)
- Performance
  - yarn perf (CLI unifiée)
  - yarn perf:suite (rapide) / yarn perf:suite:full (complète)
  - yarn perf:artillery, perf:http, perf:docker
- Mutation testing
  - yarn test:mutation, yarn test:mutation:ci

---

#### 4. Rapports et indicateurs

- Couverture Jest: rapport texte en console et, selon configuration Jest, rapports HTML/json (consulter jest.config.js)
- Playwright: dossier playwright-report
- Performance: dossiers sous reports/performance

---

#### 5. Bonnes pratiques

- En local avant PR: yarn run:all (ou yarn run:all:full si vous modifiez des parties critiques ou des performances)
- En CI: yarn run:ci pour une exécution plus rapide et déterministe
- Pour les régressions d’affichage: privilégier l’E2E Playwright et compléter avec tests de composants (Jest + Testing Library). Des tests d’accessibilité sont déjà présents dans plusieurs suites Jest.

---

#### 6. Dépannage rapide

- Si Playwright échoue localement, vérifiez que les dépendances des navigateurs sont installées: npx playwright install
- Si les tests de performance sont lents, utilisez yarn run:all --skip-perf ou exécutez la suite rapide (yarn perf:suite)
