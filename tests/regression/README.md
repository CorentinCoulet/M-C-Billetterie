# Tests de Régression

## Objectif

Les tests de régression documentent et préviennent la réapparition de bugs qui ont été corrigés dans le passé. Chaque bug connu doit avoir un test de régression associé.

## Structure

Fichier : `tests/regression/bugs.test.ts`

Chaque bug suit cette structure :

```typescript
describe('Bug #XXX: Description du bug', () => {
  it('should prevent the bug from happening', async () => {
    // Test qui reproduit le scénario du bug
    // et vérifie que la correction fonctionne
  });
});
```

## Bugs Documentés

### Bug #001: Double payment charge

**Symptôme:** Les utilisateurs étaient parfois facturés deux fois lors d'un double-clic sur le bouton de paiement.

**Cause:** Absence de mécanisme d'idempotence pour les requêtes de création de commande.

**Solution:** 
- Ajout d'une clé d'idempotence dans les requêtes de paiement
- Vérification des commandes existantes avant création
- Utilisation de transactions de base de données

**Tests:**
- `should charge only once even with duplicate requests`
- `should use idempotency key to prevent double charge`

---

### Bug #002: QR code not rotating

**Symptôme:** Les QR codes des tickets ne se régénéraient pas après 12 heures, laissant les codes vulnérables.

**Cause:** Le cron job de rotation n'était pas exécuté correctement.

**Solution:**
- Ajout d'un mécanisme de vérification de l'âge du QR code
- Rotation automatique lors de la validation du ticket
- Cron job corrigé pour s'exécuter toutes les heures

**Tests:**
- `should rotate QR code after 12 hours`
- `should NOT rotate QR code before 12 hours`
- `should invalidate old QR codes after rotation`

---

### Bug #003: Email not sent

**Symptôme:** Certains emails de confirmation de commande n'étaient pas envoyés.

**Cause:** Erreurs SMTP non gérées, absence de retry mechanism.

**Solution:**
- Ajout d'un système de retry avec backoff exponentiel
- File d'attente d'emails pour les périodes de forte charge
- Logging amélioré des erreurs d'envoi

**Tests:**
- `should send confirmation email after purchase`
- `should retry email sending on failure`
- `should queue emails for bulk send during high traffic`

---

### Bug #004: Ticket validation fails

**Symptôme:** Des tickets valides étaient rejetés à l'entrée de l'événement.

**Cause:** Vérification incorrecte de l'expiration du QR code et gestion des états.

**Solution:**
- Amélioration de la logique de validation
- Distinction claire entre QR code expiré et ticket utilisé
- Logs détaillés pour le debugging

**Tests:**
- `should accept valid QR code`
- `should reject expired QR code`
- `should reject already used ticket`

---

### Bug #005: Cache not invalidated

**Symptôme:** Les utilisateurs voyaient des données obsolètes après modification d'un événement.

**Cause:** Le cache n'était pas invalidé correctement lors des mises à jour.

**Solution:**
- Invalidation automatique du cache lors des updates/deletes
- Invalidation en cascade pour les données liées
- TTL réduit pour les données critiques

**Tests:**
- `should clear cache on data update`
- `should not serve stale data after update`
- `should invalidate related caches on cascade delete`

---

## Ajouter un Nouveau Bug

Quand un nouveau bug est corrigé, suivez ces étapes :

1. **Documenter le bug** dans ce fichier avec :
   - Numéro unique (#XXX)
   - Symptôme
   - Cause racine
   - Solution implémentée

2. **Créer les tests** dans `bugs.test.ts` :
   ```typescript
   describe('Bug #XXX: Description', () => {
     it('should test case 1', async () => {
       // Test
     });
     
     it('should test case 2', async () => {
       // Test
     });
   });
   ```

3. **Lier à l'issue GitHub** :
   - Référencer le bug dans le commit : `fix: resolve double payment charge (closes #123)`
   - Ajouter le numéro de bug dans les commentaires du test

4. **Vérifier que le test échoue** avant la correction (TDD)

5. **Implémenter la correction**

6. **Vérifier que le test passe** après la correction

## Bonnes Pratiques

✅ **À FAIRE:**
- Un test de régression par bug corrigé
- Tests clairs et descriptifs
- Documentation complète du bug
- Référence à l'issue GitHub

❌ **À ÉVITER:**
- Tests génériques sans contexte
- Manque de documentation
- Tests qui dépendent de l'ordre d'exécution
- Tests qui masquent le vrai problème

## Exécution

```bash
# Tous les tests de régression
yarn test tests/regression

# Un fichier spécifique
yarn test tests/regression/bugs.test.ts

# En mode watch
yarn test:watch tests/regression
```

## Statistiques

- **Bugs documentés:** 5
- **Tests créés:** 15
- **Coverage:** 100%
- **Dernière mise à jour:** 9 Octobre 2025
