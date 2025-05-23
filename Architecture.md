# 🎟️ Documentation du Projet de Billetterie – M&C Society

## 📁 Structure des Pages (Next.js Routing)

### 🏠 Pages Publiques
| Route                   | Description |
|------------------------|-------------|
| `/`                    | Accueil avec CTA et mise en avant des événements |
| `/evenements`          | Liste des événements (filtres, recherche) |
| `/evenements/[id]`     | Détails d’un événement |
| `/connexion`           | Formulaire de connexion |
| `/inscription`         | Formulaire d'inscription |

---

### 👤 Pages Utilisateur
| Route                    | Description |
|-------------------------|-------------|
| `/mon-compte`           | Profil utilisateur |
| `/mes-billets`          | Liste des billets achetés |
| `/commandes/[id]`       | Détail d’une commande |

---

### 🎟️ Pages Organisateur
| Route                          | Description |
|-------------------------------|-------------|
| `/dashboard/organisateur`     | Tableau de bord de ses événements |
| `/evenements/nouveau`         | Formulaire de création |
| `/evenements/[id]/edition`    | Modifier un événement |
| `/evenements/[id]/billets`    | Voir billets vendus pour un événement |

---

### 🛠️ Pages Administrateur
| Route                   | Description |
|------------------------|-------------|
| `/admin/dashboard`     | Vue d'ensemble (stats, activité) |
| `/admin/utilisateurs`  | Gérer les utilisateurs |
| `/admin/evenements`    | Gérer/modérer les événements |
| `/admin/commandes`     | Suivi des commandes |

---

### 🔁 Pages Fonctionnelles
| Route                      | Description |
|---------------------------|-------------|
| `/paiement/success`       | Confirmation paiement |
| `/paiement/annule`        | Annulation paiement |
| `404.tsx`, `500.tsx`      | Pages d'erreur personnalisées |

---

## 👥 Rôles et Accès

| Rôle         | Accès principal |
|--------------|-----------------|
| Visiteur     | Accueil, événements, inscription |
| Utilisateur  | Achat, billets, profil |
| Organisateur | Création + gestion d'événements |
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
- **Backend intégré** : Next.js API routes
- **ORM** : Prisma
- **Base de données** : PostgreSQL
- **Paiement** : Stripe API
- **Notifications** : Email (SMTP ou service tierce)
- **Déploiement** : Vercel ou VPS (avec PostgreSQL externe)

---

## 🗂️ Arborescence Simplifiée (pages)

```bash
pages/
│
├── index.tsx
├── connexion.tsx
├── inscription.tsx
├── evenements/
│ ├── index.tsx
│ ├── [id].tsx
│ ├── nouveau.tsx
│ └── [id]/edition.tsx
├── dashboard/
│ └── organisateur.tsx
├── mon-compte.tsx
├── mes-billets.tsx
├── commandes/
│ └── [id].tsx
├── admin/
│ ├── dashboard.tsx
│ ├── utilisateurs.tsx
│ ├── evenements.tsx
│ └── commandes.tsx
├── paiement/
│ ├── success.tsx
│ └── annule.tsx
├── 404.tsx
```
## 📌 TODO technique

- [ ] Auth sécurisée (JWT / session)
- [ ] Intégration Stripe
- [ ] Filtrage + recherche d’événements
- [ ] Génération de QR code billet
- [ ] Tableaux de bord utilisateurs / orga / admin
- [ ] Tests (unitaires, e2e)

---

## 👨‍💻 Auteur
- Projet personnel M&C Society
- Stack : Next.js + Prisma + PostgreSQL + Stripe