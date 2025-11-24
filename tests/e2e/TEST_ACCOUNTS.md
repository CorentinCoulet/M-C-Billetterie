# 🔐 Comptes de Test - Données de Seed

Ce document liste tous les comptes créés par le seed de la base de données de test.

## 📊 Comptes Disponibles

### 👨‍💼 Administrateur

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@demo.com` | `AdminDemo123!` | ADMIN |

### 🎭 Organisateurs

| Email | Nom | Mot de passe | Événements |
|-------|-----|--------------|------------|
| `music.events@demo.com` | Music Events Pro | `OrganizerDemo123!` | 3 concerts |
| `sports.manager@demo.com` | Sports Manager | `OrganizerDemo123!` | 3 événements sportifs |
| `tech.conferences@demo.com` | Tech Conferences Inc | `OrganizerDemo123!` | 2 conférences |
| `culture.events@demo.com` | Culture Events | `OrganizerDemo123!` | 3 événements culturels |

### 👥 Utilisateurs Réguliers

| Email | Nom | Mot de passe | Commandes |
|-------|-----|--------------|-----------|
| `alice.martin@demo.com` | Alice Martin | `UserDemo123!` | 2 commandes |
| `bob.dubois@demo.com` | Bob Dubois | `UserDemo123!` | 1 commande |
| `claire.bernard@demo.com` | Claire Bernard | `UserDemo123!` | 2 commandes |
| `david.petit@demo.com` | David Petit | `UserDemo123!` | 1 commande |
| `emma.durand@demo.com` | Emma Durand | `UserDemo123!` | 1 commande |

---

## 📝 Utilisation dans les Tests E2E

### Test d'inscription avec email existant

Le test utilise maintenant un email réel du seed :

```typescript
// ✅ CORRECT - Utilise alice.martin@demo.com qui existe
await page.fill('[name="email"]', 'alice.martin@demo.com');
```

### Test de connexion avec compte existant

Pour tester la connexion, utilisez n'importe quel compte du seed :

```typescript
// Exemple avec Alice Martin
await page.fill('[name="email"]', 'alice.martin@demo.com');
await page.fill('[name="password"]', 'UserDemo123!');
```

### Variables d'environnement (.env.test)

Les mots de passe sont définis dans `.env.test` :

```env
SEED_ADMIN_PASSWORD=AdminDemo123!
SEED_ORGANIZER_PASSWORD=OrganizerDemo123!
SEED_USER_PASSWORD=UserDemo123!
```

---

## 🎯 Tests Corrigés

### ✅ `tests/e2e/auth.spec.ts`

Le test `"registration with existing email shows error"` utilise maintenant :
- Email : `alice.martin@demo.com` (existe dans le seed)
- Comportement attendu : Affiche une erreur OU redirige vers `/login`

---

## 🔄 Régénérer les Données de Test

Pour recréer les données de test :

```bash
# Nettoyer et re-seed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:reset

# Ou juste re-seed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billetterie_test" yarn db:seed
```

---

## 📚 Fichier Source

Les fixtures sont définies dans : `src/data/fixtures/seed.ts`

Les mots de passe sont gérés dans : `prisma/seed.ts`

