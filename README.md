
# 🎟️ M&C Society - Plateforme de Billetterie

Bienvenue sur le dépôt de **M&C Society**, un système complet de gestion d’événements et de billetterie.  
Ce projet monolithique repose sur **Next.js** pour le frontend & backend, **Prisma** comme ORM, et **PostgreSQL** en base de données.  
Le tout est containerisé avec Docker pour un environnement reproductible.

---

## 🚀 Fonctionnalités principales

- Authentification (JWT + sessions sécurisées)
- Création et gestion d’événements
- Réservation et paiement en ligne (Stripe)
- Gestion de billets (QR Code, validation, téléchargement)
- Notifications email (inscription, achat, rappel)
- Tableau de bord utilisateur
- Tableau de bord organisateur
- Interface admin pour la modération

---

## 🧱 Stack technique

| Technologie      | Rôle                                      |
|------------------|-------------------------------------------|
| Next.js          | Frontend + API REST monolithique          |
| TypeScript       | Typage fort sur tout le projet            |
| Prisma           | ORM type-safe pour PostgreSQL             |
| PostgreSQL       | Base de données relationnelle             |
| Stripe           | Paiement sécurisé                         |
| Nodemailer       | Notifications par email via SMTP          |
| Tailwind CSS     | UI moderne responsive                     |
| Jest / Supertest | Tests unitaires et d’intégration          |
| Docker / Compose | Conteneurisation locale et CI             |

---

## 📁 Arborescence simplifiée

```
├── docker/ # Dockerfiles (prod/dev)
├── prisma/ # Schéma et seed DB
├── public/ # Assets statiques
├── src/
│ ├── components/ # Composants UI
│ ├── lib/ # Utilitaires (auth, stripe, db…)
│ ├── middlewares/ # Middleware back (auth, rate limit…)
│ ├── pages/ # Pages Next.js et API routes
│ ├── services/ # Logique métier (event, ticket, user…)
│ ├── tests/ # Tests unitaires et intégration
│ └── types/ # Types partagés
├── .env* # Variables d’environnement
├── docker-compose.yml
├── jest.config.ts
├── next.config.js
└── tsconfig.json
```

---

## ⚙️ Installation locale

### 1. Cloner le repo

```bash
git clone https://github.com/CorentinCoulet/M-C-Billetterie.git
cd M-C-Billetterie
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d’environnement

Crée un fichier `.env` à partir du `.env.example` :

```bash
cp .env.example .env
cp .env.example .env.test
```

À configurer :
- `DATABASE_URL`
- `NODE_ENV`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### 4. Initialiser la base de données

```bash
npx prisma migrate dev --name init
npx prisma db seed

docker exec -it billetterie-app npx prisma migrate dev --name init
docker exec -it billetterie-app npx prisma db seed
```

### 5. Lancer le serveur

```bash
# Pour le mode production avec Docker
docker-compose up --build

# ou pour le mode dev sans Docker
npm run dev
```

L’application sera disponible sur : `http://localhost:3000`
La base de donnée via Adminer sera disponible sur : `http://localhost:8080`

---

## 🧪 Tests

```bash
# Pour lancer les tests unitaires
npm run test
```
---

## 📌 Roadmap

| Fonctionnalité                                                            | MVP |
|---------------------------------------------------------------------------|:---:|
| Authentification par email / mot de passe                                 | ✅ |
| Vérification d’email (token de confirmation)                              | ✅ |
| Connexion / déconnexion sécurisée (JWT + sessions)                        | ✅ |
| Tableau de bord utilisateur (billets, commandes, infos perso)             | ✅ |
| Création et gestion d’événements par les organisateurs                    | ✅ |
| Page publique d’un événement                                              | ✅ |
| Réservation de billets                                                    | ✅ |
| Paiement en ligne via Stripe                                              | ✅ |
| Génération de QR Code sur les billets                                     | ✅ |
| Validation de billets (statut utilisé)                                    | ✅ |
| Système de rôles (Visiteur, Utilisateur, Organisateur, Admin)             | ✅ |
| Page d’accueil avec listing des événements                                | ✅ |
| Interface Admin basique (liste utilisateurs/événements)                   | ✅ |
| Notifications email (confirmation inscription, commande)                  | ✅ |

### 🔜 Fonctionnalités prévues (hors MVP)

| Fonctionnalité                                                            | MVP |
|---------------------------------------------------------------------------| --- |
| Tableau de bord complet pour les organisateurs (stats, export, etc.)      | ⬜️ |
| Interface de scan QR pour contrôle d’accès sur mobile                     | ⬜️ |
| Gestion des remboursements                                                | ⬜️ |
| Gestion avancée des statuts de commande (remboursé, expiré, etc.)         | ⬜️ |
| Table de logs d'activité (admin, user)                                    | ⬜️ |
| Internationalisation (i18n)                                               | ⬜️ |
| Interface admin avancée (modération, dashboard, gestions rôles)           | ⬜️ |
| Support multi-devise (€, $, …)                                            | ⬜️ |
| Gestion de code promo / réductions                                        | ⬜️ |
| Support mobile / PWA                                                      | ⬜️ |
| Événements privés / sur invitation                                        | ⬜️ |
| Historique de connexion                                                   | ⬜️ |
| Notes et avis sur les événements                                          | ⬜️ |
| Notifications push / In-app                                               | ⬜️ |
| Export PDF / CSV des billets ou commandes                                 | ⬜️ |
| Accès invité (achat sans création de compte)                              | ⬜️ |

---

## 👥 Rôles utilisateurs

| Rôle         | Droits principaux                                                                |
|--------------|----------------------------------------------------------------------------------|
| **Visiteur**     | Navigation publique, inscription                                             |
| **Utilisateur**  | Réservation, accès à ses billets, profil, réception de notifications         |
| **Organisateur** | Création, édition et suivi de ses événements, accès au tableau de bord       |
| **Admin**        | Modération des utilisateurs, gestion des événements, accès aux logs & stats  |


---

## 📄 Licence

Ce projet est open-source sous licence **MIT**.  
Tu peux l’utiliser, le modifier et le redistribuer librement.

---

## 🤝 Contribuer

Les contributions sont les bienvenues !  
Merci de respecter les étapes suivantes :

1. **Fork** le projet
2. Crée une branche : `feature/ma-fonctionnalité`
3. Propose une **pull request** claire et documentée

Avant de proposer une PR :
- Lance les tests : `npm run test`
- Vérifie le linting : `npm run lint`
- Respecte la structure projet (services, types, tests…)

---

## 🧑‍💻 Auteur

Développé avec ❤️ par [Corentin Coulet](https://github.com/CorentinCoulet)  
📫 Contact : coulet.corentin@gmail.com
