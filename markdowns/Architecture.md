# 🎟️ Documentation du Projet de Billetterie – M&C Society

## 📁 Structure des Pages (Next.js Routing)

### 🏠 Pages Publiques
| Route                  |                   Description                     |
|------------------------|---------------------------------------------------|
| `/`                    | Accueil avec CTA et mise en avant des événements  |
| `/evenements`          | Liste des événements (filtres, recherche)         |
| `/evenements/[id]`     | Détails d’un événement                            |
| `/connexion`           | Formulaire de connexion                           |
| `/inscription`         | Formulaire d'inscription                          |
| `/mot-de-passe-oublie` | Réinitialisation de mot de passe                  |
| `/reset-password`      | Page de modification de mot de passe (avec token) |


---

### 👤 Pages Utilisateur
| Route                   |       Description         |
|-------------------------|---------------------------|
| `/mon-compte`           | Profil utilisateur        |
| `/mes-billets`          | Liste des billets achetés |
| `/commandes/[id]`       | Détail d’une commande     |

---

### 🎟️ Pages Organisateur
| Route                         |             Description               |
|-------------------------------|---------------------------------------|
| `/dashboard/organisateur`     | Tableau de bord de ses événements     |
| `/evenements/nouveau`         | Formulaire de création                |
| `/evenements/[id]/edition`    | Modifier un événement                 |
| `/evenements/[id]/billets`    | Voir billets vendus pour un événement |

---

### 🛠️ Pages Administrateur
| Route                  |          Description             |
|------------------------|----------------------------------|
| `/admin/dashboard`     | Vue d'ensemble (stats, activité) |
| `/admin/utilisateurs`  | Gérer les utilisateurs           |
| `/admin/evenements`    | Gérer/modérer les événements     |
| `/admin/commandes`     | Suivi des commandes              |

---

### 🔁 Pages Fonctionnelles
| Route                     |         Description           |
|---------------------------|-------------------------------|
| `/paiement/success`       | Confirmation paiement         |
| `/paiement/annule`        | Annulation paiement           |
| `404.tsx`, `500.tsx`      | Pages d'erreur personnalisées |

---

## 👥 Rôles et Accès

| Rôle         |        Accès principal             |
|--------------|------------------------------------|
| Visiteur     | Accueil, événements, inscription   |
| Utilisateur  | Achat, billets, profil             |
| Organisateur | Création + gestion d'événements    |
| Admin        | Modération, stats, gestion globale |

---

## 🧭 Navigation Principale

- `Événements` → `/evenements`
- `Connexion` / `Inscription` → `/connexion` / `/inscription`
- `Tableau de bord` → selon le rôle (`/mon-compte`, `/dashboard/organisateur`, `/admin/dashboard`)
- `Mes billets` → `/mes-billets`

---

## 📦 Fonctionnalités Clés

### ⚙️ Utilisateur
- Authentification
- Réservation d’événements
- Paiement en ligne (Stripe)
- Téléchargement de billet
- Réinitialisation du mot de passe

### 📊 Organisateur
- Création / édition d’événements
- Suivi des ventes
- Visualisation des participants

### 🛡️ Admin
- Gestion utilisateurs
- Statistiques générales
- Modération des contenus

---

## 🧱 Architecture Technique

- **Frontend** : Next.js (pages + API routes)
- **Backend intégré** : API REST via Next.js
- **ORM** : Prisma
- **Base de données** : PostgreSQL
- **Paiement** : Stripe API
- **Notifications** : Email via SMTP
- **Déploiement** : Docker sur VPS
- **Middleware / Logs** : Ajout prevu dans une version ultérieure
- **i18n** : Prévu pour une version future

---

## 🗂️ Arborescence Simplifiée (pages)

```bash
pages/
├── 404.tsx
├── admin/
│   ├── orders.tsx
│   ├── dashboard.tsx
│   ├── events.tsx
│   └── users.tsx
├── auth/
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── dashboard/
│   └── organizer.tsx
├── events/
│   ├── index.tsx
│   ├── [id].tsx
│   ├── new.tsx
│   ├── [id]
|       ├── edit.tsx
│       └── /tickets.tsx
├── my-account.tsx
├── my-tickets.tsx
├── orders/
│   └── [id].tsx
├── payment/
│   ├── success.tsx
│   └── cancel.tsx
└── index.tsx
```
## 📌 TODO technique

- [ ] Auth sécurisée (JWT / session)
- [ ] Intégration Stripe
- [ ] Filtrage + recherche d’événements
- [ ] Génération de QR code billet
- [ ] Tableaux de bord utilisateurs / orga / admin
- [ ] Tests (unitaires, e2e)
- [ ] Mise en place de la couche API (routes + services)
- [ ] Internationalisation (next-intl, prévu post-MVP)

---

## 👨‍💻 Auteur
- Projet personnel M&C Society
- Stack : Next.js + Prisma + PostgreSQL + Stripe