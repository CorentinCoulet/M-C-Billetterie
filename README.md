
# 🎟️ M&C Society - Plateforme de Billetterie

Bienvenue sur le dépôt de M&C Society, un système complet de gestion d'événements et de billetterie en ligne. Ce projet est développé en **architecture monolithique** avec **Next.js** pour le frontend & backend, **Prisma** comme ORM, et **PostgreSQL** pour la base de données.

---

## 🚀 Fonctionnalités principales

- Authentification (connexion / inscription)
- Listing et recherche d’événements
- Réservation et paiement de billets (Stripe)
- Gestion de billets (QR code, statut, téléchargement)
- Tableau de bord utilisateur
- Création et gestion d’événements pour les organisateurs
- Tableau de bord administrateur pour la modération
- Notifications email (confirmation, paiement…)

---

## 🧱 Stack technique

| Technologie     | Description                        |
|----------------|------------------------------------|
| Next.js         | Frontend & API monolithique        |
| TypeScript      | Typage statique                    |
| Prisma          | ORM type-safe                      |
| PostgreSQL      | Base de données relationnelle      |
| Stripe          | Paiement en ligne sécurisé         |
| Nodemailer / SMTP | Notifications par email           |
| Tailwind CSS    | Design moderne et responsive       |

---

## 📁 Arborescence simplifiée

```
/src
  ├── pages/                 # Pages Next.js (frontend + API routes)
  ├── components/            # Composants UI réutilisables
  ├── services/              # Logique métier (Order, Event, Auth, etc.)
  ├── lib/                   # Fonctions utilitaires (stripe, db, auth)
  ├── styles/                # Fichiers CSS / Tailwind config
  └── prisma/                # Schéma + seed
```

---

## ⚙️ Installation locale

### 1. Cloner le repo

```bash
git clone https://github.com/CorentinCoulet/M-C-Billetterie.git
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d’environnement

Crée un fichier `.env` à partir du `.env.example` :

```bash
cp .env.example .env
```

À configurer :
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `EMAIL_SERVER`
- etc.

### 4. Initialiser la base de données

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Lancer le serveur

```bash
npm run dev
```

L’application sera disponible sur : `http://localhost:3000`

---

## 🧪 Tests

À venir :
- Tests unitaires avec Jest
- Tests end-to-end avec Playwright ou Cypress

---

## 📌 Roadmap

- [x] Authentification
- [x] Création d’événements
- [x] Paiement en ligne
- [ ] Tableau de bord admin
- [ ] Tests automatisés
- [ ] Internationalisation (i18n)
- [ ] PWA & mobile-first UX

---

## 👥 Rôles utilisateurs

| Rôle         | Accès |
|--------------|-------|
| Visiteur     | Navigation publique, inscription |
| Utilisateur  | Réservation, billets, profil |
| Organisateur | Création / gestion événements |
| Admin        | Modération, stats, gestion globale |

---

## 📄 Licence

Ce projet est open-source sous licence **MIT**.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Merci de :
1. Fork le projet
2. Créer une branche `feature/ma-fonctionnalité`
3. Soumettre une PR bien documentée

---

## 🧑‍💻 Auteur

Développé avec ❤️ par [TonNom / GitHub](https://github.com/votre-utilisateur)  
Contact : contact@mc-society.com
