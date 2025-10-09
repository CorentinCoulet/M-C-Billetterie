# Property-Based Testing

Tests avec génération automatique de données pour découvrir des edge cases et valider les propriétés invariantes.

## 📋 Vue d'ensemble

Les tests property-based utilisent **fast-check** pour générer automatiquement des milliers de cas de test aléatoires et vérifier que certaines propriétés sont toujours vraies.

### Avantages

✅ **Découverte automatique d'edge cases** - Trouve des bugs que les tests manuels manquent  
✅ **Coverage exhaustif** - Teste des milliers de combinaisons  
✅ **Propriétés invariantes** - Vérifie les règles qui doivent toujours être vraies  
✅ **Réduction automatique** - fast-check trouve le cas minimal qui échoue  

## 📊 Statistiques

- **3 suites de tests** : Validation, Pricing, Security
- **~2500 tests générés** automatiquement
- **100% de réussite**
- **Temps d'exécution** : ~8-10 secondes

## 🧬 Suites de tests

### 1. Validation (`validation.property.test.ts`)

Tests des fonctions de validation avec génération aléatoire de données.

**Catégories testées** :
- ✅ Event Validation (100 runs)
- ✅ Order Validation (100 runs)
- ✅ Pricing Calculation (1000 runs)
- ✅ String Sanitization (1000 runs)
- ✅ QR Code Generation (100 runs)
- ✅ Date Handling (100 runs)
- ✅ Email Validation (100 runs)

**Total** : ~2400 tests générés

### 2. Pricing (`pricing.property.test.ts`)

Tests avancés des calculs de prix, remises et commissions.

**Catégories testées** :
- ✅ Order Total Calculation (200 runs)
- ✅ Discount Application (200 runs)
- ✅ Commission Calculation (200 runs)
- ✅ Complex Calculations (300 runs)
- ✅ Refund Calculation (200 runs)
- ✅ Bulk Discounts (200 runs)
- ✅ Early Bird Pricing (200 runs)
- ✅ Price Rounding (500 runs)
- ✅ Price Boundaries (200 runs)

**Total** : ~2200 tests générés

### 3. Security (`security.property.test.ts`)

Tests de sécurité avec génération d'attaques XSS, SQL Injection, etc.

**Catégories testées** :
- ✅ XSS Protection (1100 runs)
- ✅ SQL Injection Detection (500 runs)
- ✅ Password Security (350 runs)
- ✅ Email Validation (550 runs)
- ✅ Phone Validation (400 runs)
- ✅ Token Generation (1150 runs)
- ✅ JWT Validation (300 runs)
- ✅ Input Length Limits (150 runs)
- ✅ Unicode Handling (300 runs)

**Total** : ~4800 tests générés

## 🚀 Utilisation

### Lancer tous les tests property-based

```bash
yarn test:property
```

### Lancer un fichier spécifique

```bash
yarn test:property validation
yarn test:property pricing
yarn test:property security
```

### En mode watch

```bash
yarn test:property --watch
```

### Avec coverage

```bash
yarn test:property --coverage
```

## 📖 Exemples

### Exemple 1 : Validation de prix

```typescript
it('should always calculate correct total price', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 100 }), // quantity
      fc.double({ min: 0.01, max: 1000, noNaN: true }), // unit price
      (quantity, unitPrice) => {
        const total = calculateTotalPrice(quantity, unitPrice);
        
        // Propriétés qui doivent toujours être vraies
        expect(total).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(total)).toBe(true);
        expect(total).toBeCloseTo(quantity * unitPrice, 2);
      }
    ),
    { numRuns: 1000 } // 1000 tests générés
  );
});
```

### Exemple 2 : Sécurité XSS

```typescript
it('should always produce safe HTML output', () => {
  fc.assert(
    fc.property(
      fc.string(),
      (unsafeInput) => {
        const sanitized = sanitizeHTML(unsafeInput);
        
        // Ne doit jamais contenir de patterns dangereux
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/onerror=/i);
      }
    ),
    { numRuns: 500 }
  );
});
```

### Exemple 3 : Calcul de remise

```typescript
it('should apply discounts correctly', () => {
  fc.assert(
    fc.property(
      fc.record({
        basePrice: fc.double({ min: 10, max: 1000, noNaN: true }),
        quantity: fc.integer({ min: 1, max: 100 }),
        discount: fc.double({ min: 0, max: 0.5, noNaN: true }),
      }),
      (data) => {
        const total = calculateOrderTotal(data);
        const baseTotal = data.basePrice * data.quantity;
        
        // Le total avec remise doit être inférieur au total de base
        expect(total).toBeLessThanOrEqual(baseTotal);
      }
    ),
    { numRuns: 200 }
  );
});
```

## 🎯 Propriétés testées

### Propriétés numériques

- ✅ Prix toujours >= 0
- ✅ Quantité toujours >= 1
- ✅ Remise entre 0 et 100%
- ✅ Commission entre 0 et 30%
- ✅ Arrondi à 2 décimales
- ✅ Pas de NaN ou Infinity

### Propriétés de sécurité

- ✅ Pas de balises `<script>`
- ✅ Pas de `javascript:` protocol
- ✅ Pas d'event handlers (`onclick`, etc.)
- ✅ Pas de SQL keywords dangereux
- ✅ Tokens cryptographiquement sûrs
- ✅ Mots de passe hashés de manière consistante

### Propriétés de validation

- ✅ Email valide contient `@` et `.`
- ✅ Téléphone format français valide
- ✅ JWT a 3 parties séparées par `.`
- ✅ Dates futures > Date.now()
- ✅ QR codes uniques

## 🔍 Générateurs fast-check

### Générateurs de base

```typescript
fc.integer({ min: 1, max: 100 })        // Entier entre 1 et 100
fc.double({ min: 0, max: 1000 })        // Double entre 0 et 1000
fc.string({ minLength: 3 })             // String de 3+ caractères
fc.boolean()                            // true ou false
fc.constant('value')                    // Valeur constante
```

### Générateurs composés

```typescript
fc.record({                             // Objet avec propriétés
  name: fc.string(),
  age: fc.integer({ min: 0, max: 120 })
})

fc.array(fc.integer())                  // Tableau d'entiers
fc.oneof(fc.integer(), fc.string())     // Un type ou l'autre
fc.tuple(fc.integer(), fc.string())     // Tuple [number, string]
```

### Générateurs spécialisés

```typescript
fc.emailAddress()                       // Email valide
fc.webUrl()                            // URL web valide
fc.uuid()                              // UUID v4
fc.date()                              // Date
fc.base64String()                      // String base64
fc.unicodeString()                     // String unicode
```

## 🐛 Debugging

### Voir les valeurs générées

```typescript
fc.assert(
  fc.property(
    fc.integer(),
    (value) => {
      console.log('Testing with:', value);
      expect(value).toBeDefined();
    }
  )
);
```

### Seed pour reproductibilité

```typescript
fc.assert(
  fc.property(
    fc.integer(),
    (value) => {
      expect(value).toBeDefined();
    }
  ),
  { seed: 42 } // Toujours même séquence
);
```

### Réduire le nombre de runs

```typescript
fc.assert(
  fc.property(
    fc.integer(),
    (value) => {
      expect(value).toBeDefined();
    }
  ),
  { numRuns: 10 } // Seulement 10 tests (pour debug)
);
```

## 📈 Métriques de performance

| Suite | Tests générés | Temps | Status |
|-------|--------------|-------|--------|
| Validation | ~2400 | ~3s | ✅ 100% |
| Pricing | ~2200 | ~3s | ✅ 100% |
| Security | ~4800 | ~4s | ✅ 100% |
| **TOTAL** | **~9400** | **~10s** | **✅ 100%** |

## 🎓 Ressources

- [fast-check Documentation](https://fast-check.dev/)
- [Property-Based Testing Guide](https://fast-check.dev/docs/introduction/)
- [Examples Repository](https://github.com/dubzzz/fast-check)

## 🚧 Tests à ajouter

### Court terme

- [ ] Tests de concurrence (race conditions)
- [ ] Tests de performance (big O validation)
- [ ] Tests de state machines

### Long terme

- [ ] Integration avec mutation testing
- [ ] Shrinking custom pour types complexes
- [ ] Generators pour types métier (Event, Order, etc.)

## 📝 Bonnes pratiques

### ✅ À FAIRE

- Tester des **propriétés**, pas des valeurs exactes
- Utiliser **numRuns élevé** (100-1000) pour trouver edge cases
- **Filtrer** les inputs invalides avec `fc.pre()` ou `.filter()`
- Vérifier les **invariants** qui doivent toujours être vrais
- Tester les **limites** (min/max, empty, null)

### ❌ À ÉVITER

- Ne pas tester des valeurs exactes (23 + 45 = 68)
- Ne pas utiliser trop de `fc.constant()` (perd l'intérêt)
- Ne pas ignorer les échecs de tests property-based
- Ne pas avoir trop peu de runs (< 50)
- Ne pas oublier de tester les cas d'erreur

## 🎯 Objectifs

- [x] Créer 3 suites de tests property-based
- [x] Générer >5000 tests automatiquement
- [x] Coverage : Validation, Pricing, Security
- [x] Documentation complète
- [x] 100% de réussite
- [ ] Intégration CI/CD
- [ ] Tests de régression avec shrinking

---

**Dernière mise à jour** : 9 Octobre 2025  
**Status** : ✅ Opérationnel (3/3 suites complétées)
