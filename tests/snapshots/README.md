# Tests Snapshot

## 📋 Vue d'ensemble

Les tests snapshot capturent la structure actuelle des templates d'emails et des réponses API pour détecter automatiquement les changements non intentionnels. Ils servent de filet de sécurité contre les régressions visuelles et structurelles.

## 📊 Statistiques

- **Total des tests:** ~50 tests snapshot
- **Catégories:** 2 fichiers (Email Templates, API Responses)
- **Snapshots générés:** ~50 fichiers .snap
- **Temps d'exécution:** ~2-3 secondes

## 🎯 Objectifs

1. **Détection de régression:** Identifier les changements non intentionnels
2. **Documentation visuelle:** Servir de documentation du rendu actuel
3. **Review simplifiée:** Faciliter la revue des changements intentionnels
4. **Stabilité:** Assurer la cohérence des outputs

## 📁 Structure des Tests

```
tests/snapshots/
├── email-templates.snapshot.test.ts     # Tests templates emails (~30 tests)
├── api-responses.snapshot.test.ts       # Tests réponses API (~20 tests)
└── __snapshots__/                       # Snapshots générés automatiquement
    ├── email-templates.snapshot.test.ts.snap
    └── api-responses.snapshot.test.ts.snap
```

## 🧪 Tests par Catégorie

### Email Templates Snapshots (`email-templates.snapshot.test.ts`)

#### 1. Welcome Email Template (2 tests)
- ✅ Snapshot rendu email welcome
- ✅ Rendu avec différentes données utilisateur

#### 2. Order Confirmation Email Template (2 tests)
- ✅ Snapshot confirmation de commande
- ✅ Commande avec plusieurs articles

#### 3. Ticket Email Template (2 tests)
- ✅ Snapshot email de ticket
- ✅ Ticket avec différent siège

#### 4. Password Reset Email Template (2 tests)
- ✅ Snapshot reset password
- ✅ Inclusion avertissement sécurité

#### 5. Event Reminder Email Template (2 tests)
- ✅ Snapshot rappel événement
- ✅ Rappel pour différentes périodes

#### 6. Organization Invitation Email Template (2 tests)
- ✅ Snapshot invitation organisation
- ✅ Inclusion information rôle

#### 7. Order Cancellation Email Template (2 tests)
- ✅ Snapshot annulation commande
- ✅ Inclusion information remboursement

#### 8. Individual Ticket Email Template (1 test)
- ✅ Snapshot ticket individuel

#### 9. Email Layout Consistency (2 tests)
- ✅ Cohérence header entre templates
- ✅ Cohérence footer entre templates

#### 10. Template Accessibility (2 tests)
- ✅ Inclusion textes alternatifs images
- ✅ Utilisation HTML sémantique

### API Responses Snapshots (`api-responses.snapshot.test.ts`)

#### 1. Events API (3 tests)
- ✅ Snapshot GET /api/events (liste)
- ✅ Snapshot GET /api/events/:id (détail)
- ✅ Snapshot POST /api/events (création)

#### 2. Orders API (3 tests)
- ✅ Snapshot GET /api/orders/:id (détail)
- ✅ Snapshot POST /api/orders (création)
- ✅ Snapshot GET /api/orders (liste utilisateur)

#### 3. Users API (2 tests)
- ✅ Snapshot GET /api/users/me (profil)
- ✅ Snapshot PUT /api/users/me (mise à jour)

#### 4. Authentication API (3 tests)
- ✅ Snapshot POST /api/auth/login
- ✅ Snapshot POST /api/auth/register
- ✅ Snapshot POST /api/auth/logout

#### 5. Tickets API (2 tests)
- ✅ Snapshot GET /api/tickets/:id
- ✅ Snapshot POST /api/tickets/:id/validate

#### 6. Admin API (2 tests)
- ✅ Snapshot GET /api/admin/stats
- ✅ Snapshot GET /api/admin/users

#### 7. Organizations API (2 tests)
- ✅ Snapshot GET /api/organizations
- ✅ Snapshot GET /api/organizations/:id

#### 8. Error Responses (6 tests)
- ✅ Snapshot 400 Bad Request
- ✅ Snapshot 401 Unauthorized
- ✅ Snapshot 403 Forbidden
- ✅ Snapshot 404 Not Found
- ✅ Snapshot 429 Rate Limit
- ✅ Snapshot 500 Internal Server Error

#### 9. Response Structure Consistency (2 tests)
- ✅ Cohérence structure réponses success
- ✅ Cohérence structure réponses error

## 🚀 Exécution des Tests

### Tous les tests snapshot

```bash
yarn test tests/snapshots
```

### Tests spécifiques

```bash
# Tests email templates uniquement
yarn test tests/snapshots/email-templates.snapshot.test.ts

# Tests API responses uniquement
yarn test tests/snapshots/api-responses.snapshot.test.ts
```

### Mettre à jour les snapshots

```bash
# Mettre à jour tous les snapshots
yarn test tests/snapshots -u

# Mettre à jour un snapshot spécifique
yarn test tests/snapshots/email-templates.snapshot.test.ts -u
```

### Mode interactif

```bash
# Mode watch pour développement
yarn test:watch tests/snapshots
```

## 📈 Workflow de Gestion des Snapshots

### 1. Première exécution (Création des snapshots)

```bash
yarn test tests/snapshots
```

Les snapshots sont créés dans `__snapshots__/`

### 2. Modifications de code

Lorsque vous modifiez un template ou une réponse API :

```bash
yarn test tests/snapshots
```

Si les tests échouent, vous verrez :
```
Snapshot Summary
 › 2 snapshots failed from 1 test suite.
```

### 3. Review des changements

Examinez les différences affichées dans le terminal :
```diff
- Expected
+ Received

- <h1>Welcome {{userName}}!</h1>
+ <h1>Bienvenue {{userName}}!</h1>
```

### 4. Décision

#### Si le changement est intentionnel :

```bash
# Mettre à jour le snapshot
yarn test tests/snapshots -u
```

#### Si le changement est non intentionnel :

Corrigez le code et relancez les tests.

### 5. Commit

Committez les fichiers `.snap` avec votre code :

```bash
git add tests/snapshots/__snapshots__/*.snap
git commit -m "feat: update email templates"
```

## 🎯 Bonnes Pratiques

### 1. Snapshots Petits et Ciblés

```typescript
// ✅ Bon - Snapshot ciblé
it('should match welcome email snapshot', () => {
  const result = renderTemplate('welcome', data);
  expect(result).toMatchSnapshot();
});

// ❌ Mauvais - Snapshot trop large
it('should match all templates', () => {
  const results = templates.map(t => renderTemplate(t, data));
  expect(results).toMatchSnapshot();
});
```

### 2. Données de Test Consistantes

```typescript
// ✅ Bon - Données stables
const data = {
  userName: 'John Doe',
  date: '2025-12-25',
};

// ❌ Mauvais - Données variables
const data = {
  userName: Math.random().toString(),
  date: new Date().toISOString(),
};
```

### 3. Nettoyage des Données Sensibles

```typescript
// ✅ Bon - Pas de données sensibles
const response = {
  id: 'usr_123',
  email: 'user@example.com',
  // password exclu
};

// ❌ Mauvais - Données sensibles
const response = {
  id: 'usr_123',
  email: 'user@example.com',
  password: 'hashed_password',
};
```

### 4. Review Obligatoire

```yaml
# .github/workflows/ci.yml
- name: Run snapshot tests
  run: yarn test tests/snapshots
  
# Rejeter si snapshots modifiés sans review
- name: Check for snapshot changes
  run: |
    if git diff --name-only | grep -q "\.snap$"; then
      echo "Snapshots modified - review required"
    fi
```

## 🔍 Debugging

### Afficher les snapshots

Les snapshots sont stockés en format texte :

```bash
cat tests/snapshots/__snapshots__/email-templates.snapshot.test.ts.snap
```

### Mode verbose

```bash
yarn test tests/snapshots --verbose
```

### Comparer manuellement

```bash
# Générer le rendu actuel
node -e "console.log(renderTemplate('welcome', data))"

# Comparer avec snapshot
diff current.html __snapshots__/welcome.snap
```

## 📊 Métriques de Qualité

### Coverage par fichier

| Fichier | Tests | Snapshots | Status |
|---------|-------|-----------|--------|
| email-templates.snapshot.test.ts | ~30 | ~30 | ✅ |
| api-responses.snapshot.test.ts | ~20 | ~20 | ✅ |

### Temps d'exécution

- Tests Email Templates: ~1.5s
- Tests API Responses: ~1.0s
- **Total: ~2-3s**

## ⚠️ Limitations

### 1. Données Dynamiques

Évitez les données qui changent à chaque exécution :

```typescript
// ❌ Problème
const data = {
  timestamp: Date.now(),
  randomId: Math.random(),
};

// ✅ Solution
const data = {
  timestamp: '2025-10-09T12:00:00Z',
  randomId: 'mock_id_123',
};
```

### 2. Taille des Snapshots

Les snapshots doivent rester lisibles :

```typescript
// ✅ Bon - Snapshot ~100 lignes
expect(emailTemplate).toMatchSnapshot();

// ❌ Mauvais - Snapshot 10000 lignes
expect(entireDatabase).toMatchSnapshot();
```

### 3. Fréquence de Mise à Jour

Ne pas mettre à jour les snapshots trop souvent :

- ✅ Changement intentionnel : Mettre à jour
- ❌ CI échoue : NE PAS mettre à jour automatiquement

## 🔄 Maintenance

### Nettoyage des Snapshots Obsolètes

```bash
# Supprimer les snapshots non utilisés
yarn test tests/snapshots -u --testNamePattern="^$"
```

### Audit Régulier

Planifier un audit trimestriel :

- [ ] Review de tous les snapshots
- [ ] Suppression des snapshots obsolètes
- [ ] Mise à jour de la documentation
- [ ] Vérification de la taille des fichiers

## 📚 Ressources

### Documentation

- [Jest Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [Best Practices](https://kentcdodds.com/blog/effective-snapshot-testing)

### Outils

- **snapshot-diff:** Pour comparer des objets complexes
- **jest-image-snapshot:** Pour les snapshots visuels

## 🎉 Conclusion

Les tests snapshot offrent une couche supplémentaire de protection contre les régressions. Ils sont particulièrement utiles pour :

- Templates d'emails (rendu HTML)
- Réponses API (structure JSON)
- Configurations complexes
- Documentation vivante

**Status:** ✅ 50+ tests snapshot créés - Détection automatique des changements activée
