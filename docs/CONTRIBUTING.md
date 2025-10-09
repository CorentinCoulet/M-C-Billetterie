# 🤝 Guide de Contribution - Billetterie Platform

Merci de votre intérêt pour contribuer à la plateforme de billetterie ! Ce guide vous aidera à bien commencer.

## 📋 Table des matières

- [Code de Conduite](#-code-de-conduite)
- [Comment contribuer](#-comment-contribuer)
- [Configuration de l'environnement](#-configuration-de-lenvironnement)
- [Standards de développement](#-standards-de-développement)
- [Processus de révision](#-processus-de-révision)
- [Types de contributions](#-types-de-contributions)

## 🤗 Code de Conduite

Ce projet respecte le [Code de Conduite Contributor Covenant](https://www.contributor-covenant.org/). En participant, vous vous engagez à respecter ce code.

### Nos engagements
- Créer un environnement ouvert et accueillant
- Respecter les points de vue et expériences différents
- Accepter les critiques constructives avec grâce
- Se concentrer sur ce qui est le mieux pour la communauté

## 🚀 Comment contribuer

### 1. Issues et Feature Requests

Avant de commencer, vérifiez les [Issues existantes](https://github.com/owner/repo/issues) :

- 🐛 **Bug reports** : Utilisez le template bug report
- ✨ **Feature requests** : Utilisez le template feature request
- 📚 **Documentation** : Améliorations de la doc
- 🔐 **Sécurité** : Contactez `security@billetterie.com`

### 2. Fork et Clone

```bash
# Fork le repo sur GitHub, puis clone votre fork
git clone https://github.com/VOTRE-USERNAME/billetterie.git
cd billetterie

# Ajout du repo original comme upstream
git remote add upstream https://github.com/ORIGINAL-OWNER/billetterie.git
```

### 3. Créer une branche

```bash
# Créer une branche pour votre contribution
git checkout -b feature/nom-de-votre-feature
# ou
git checkout -b bugfix/description-du-bug
# ou 
git checkout -b docs/amélioration-documentation
```

## ⚙️ Configuration de l'environnement

### Prérequis
- **Node.js** 18+ 
- **Docker** + Docker Compose
- **PostgreSQL** 14+
- **Git**

### Installation développement

```bash
# Installation des dépendances (TOUJOURS utiliser yarn)
yarn install

# Configuration de la base de données
cp .env.example .env
# Éditez .env avec vos paramètres locaux

# Setup de la DB
yarn db:migrate
yarn db:generate
yarn db:seed

# Démarrage en mode développement
yarn dev
```

### Tests

```bash
# Tests unitaires
yarn test

# Tests d'intégration
yarn test:integration

# Tests E2E
yarn test:e2e

# Tests du système QR
yarn test:qr

# Tests du système email
yarn test:emails
```

## 📏 Standards de développement

### Structure du code

```
src/
├── components/          # Composants React réutilisables
├── app/                # App Router Next.js (pages et API)
├── lib/                # Utilitaires et configurations
├── services/           # Services métier (QR, email, etc.)
├── types/              # Types TypeScript
├── utils/              # Fonctions utilitaires
└── config/             # Configuration application
```

### Conventions de nommage

#### Fichiers et dossiers
- **Composants** : `PascalCase.tsx` (ex: `EventCard.tsx`)
- **Pages** : `kebab-case` ou `snake_case` selon App Router
- **Services** : `camelCase.ts` (ex: `emailService.ts`)
- **Types** : `camelCase.ts` (ex: `userTypes.ts`)
- **Utilitaires** : `camelCase.ts` (ex: `dateUtils.ts`)

#### Variables et fonctions
```typescript
// Variables : camelCase
const userEmail = 'user@example.com';
const isEmailValid = true;

// Fonctions : camelCase avec verbe
function validateEmail(email: string): boolean { }
async function sendWelcomeEmail(user: User): Promise<void> { }

// Constantes : SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 1024 * 1024;
const API_ENDPOINTS = { ... };

// Types et interfaces : PascalCase
interface UserProfile { }
type EmailStatus = 'pending' | 'sent' | 'failed';
```

### Style de code

#### TypeScript
```typescript
// ✅ Bon
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

async function createUser(data: CreateUserRequest): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 12);
  
  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
  });

  return user;
}

// ❌ Éviter
function createUser(name, email, password) {
  // Code sans types
}
```

#### React/Next.js
```typescript
// ✅ Composant fonctionnel avec TypeScript
interface EventCardProps {
  event: Event;
  onSelect: (eventId: string) => void;
  className?: string;
}

export default function EventCard({ event, onSelect, className }: EventCardProps) {
  const handleClick = useCallback(() => {
    onSelect(event.id);
  }, [event.id, onSelect]);

  return (
    <div className={clsx('event-card', className)} onClick={handleClick}>
      <h3>{event.name}</h3>
      <p>{formatDate(event.date)}</p>
    </div>
  );
}
```

### Git Commits

Format : `type(scope): description`

**Types** :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage (pas de changement de code)
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Maintenance

**Exemples** :
```bash
feat(qr): add QR code rotation system
fix(email): handle SMTP connection errors
docs(readme): update installation instructions
test(api): add order validation tests
```

### Validation avant commit

```bash
# Lint
yarn lint

# Type checking
yarn type-check

# Tests
yarn test

# Build test
yarn build
```

## 🔍 Processus de révision

### Pull Request

1. **Titre descriptif** : `feat(qr): Add automatic QR code rotation`

2. **Description complète** :
   ```markdown
   ## Description
   Implémente la rotation automatique des QR codes toutes les 12h pour améliorer la sécurité.

   ## Changes
   - Ajoute le service qrRotationService
   - Crée le cron job de rotation
   - Ajoute les tests unitaires
   - Met à jour la documentation

   ## Testing
   - [ ] Tests unitaires passent
   - [ ] Tests d'intégration passent
   - [ ] Testé manuellement sur environnement local

   ## Breaking Changes
   Aucun

   ## Related Issues
   Closes #123
   ```

3. **Checklist** :
   - [ ] Tests ajoutés/mis à jour
   - [ ] Documentation mise à jour
   - [ ] Pas de breaking changes (ou documentés)
   - [ ] Code review effectué en auto-review
   - [ ] Build et tests passent

### Critères d'acceptation

- ✅ **Code quality** : Respect des standards
- ✅ **Tests** : Couverture appropriée
- ✅ **Documentation** : À jour avec les changements
- ✅ **Performance** : Pas de régression
- ✅ **Sécurité** : Pas de vulnérabilité introduite

## 🎯 Types de contributions

### 🐛 Corrections de bugs

1. Créez une issue décrivant le bug
2. Incluez les étapes de reproduction
3. Proposez une solution si possible
4. Créez une PR avec tests

### ✨ Nouvelles fonctionnalités

1. **Discussion** : Créez une issue pour discuter
2. **Design** : Proposez l'architecture/API
3. **Implémentation** : Développez par petites PR
4. **Documentation** : Mettez à jour les docs

### 📚 Documentation

- Corrections de typos
- Améliorations de clarté
- Nouveaux guides et tutoriels
- Exemples de code
- Traductions

### 🧪 Tests

- Tests unitaires manquants
- Tests d'intégration
- Tests E2E
- Tests de performance
- Tests de sécurité

## 🏷️ Labels GitHub

- `bug` : Bugs confirmés
- `enhancement` : Nouvelles fonctionnalités
- `documentation` : Améliorations doc
- `good first issue` : Bon pour débuter
- `help wanted` : Besoin d'aide
- `priority: high` : Priorité élevée
- `security` : Questions de sécurité

## 📞 Obtenir de l'aide

### Communication

- **GitHub Discussions** : Questions générales
- **GitHub Issues** : Bugs et feature requests
- **Email** : `dev@billetterie.com` pour questions complexes

### Ressources

- [Documentation technique](./README.md)
- [Guide de sécurité](./SECURITY.md)
- [Système QR](./QR_SYSTEM.md)
- [Système Email](./EMAIL_SYSTEM.md)

## 🎉 Remerciements

Chaque contribution, qu'elle soit petite ou grande, est appréciée ! Merci de faire de cette plateforme un projet open source de qualité.

### Hall of Fame 🏆

Les contributeurs qui ont fait une différence significative seront reconnus ici.

---

**🚀 Bon développement et merci pour vos contributions !**
