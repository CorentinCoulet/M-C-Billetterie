# 🎫 Billetterie - Application Complète

**Une application moderne de billetterie construite avec Next.js 15, TypeScript, Prisma et PostgreSQL**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.10.1-2D3748)

## ✨ Fonctionnalités

### 🏠 **Interface Utilisateur**
- **Découverte d'événements** avec filtres et catégories
- **Pages détail** complètes avec toutes informations
- **Système de panier** entièrement fonctionnel
- **Process de checkout** sécurisé
- **Authentification** login/register

### 👨‍💼 **Dashboard Administrateur**
- **Statistiques globales** en temps réel
- **Gestion utilisateurs** complète
- **Supervision événements** avec modération
- **Suivi des commandes** et paiements
- **Configuration système** avancée

### 🎪 **Dashboard Organisateur**
- **Métriques spécifiques** pour ses événements
- **Gestion d'événements** CRUD complète
- **Suivi des ventes** et analytics
- **Vue des participants** et billets

## 🚀 Démarrage Rapide

### **Prérequis**
- Node.js 18+
- Docker Desktop
- Git

### **Installation Automatique**
```bash
# Windows PowerShell
.\setup-billetterie.ps1

# Windows CMD
setup-billetterie.bat
```

### **Installation Manuelle**
```bash
# 1. Cloner le projet
git clone <repository-url>
cd billetterie

# 2. Installer les dépendances
npm install

# 3. Démarrer Docker Desktop puis :
docker-compose up -d

# 4. Configuration base de données
npx prisma migrate dev --name init
npx prisma db seed

# 5. Démarrer l'application
npm run dev
```

**🌐 Application disponible sur : http://localhost:3000**

## 🔐 Comptes de Démonstration

```
👤 Utilisateur    : user@demo.com  / demo123
🎪 Organisateur   : org@demo.com   / demo123  
👨‍💼 Administrateur : admin@demo.com / demo123
```

## 🛠️ Technologies

### **Frontend**
- **Next.js 15** - Framework React moderne
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Radix UI** - Composants accessibles
- **React Context** - Gestion d'état globale

### **Backend**
- **Next.js API Routes** - APIs REST
- **Prisma** - ORM type-safe
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Hachage sécurisé

### **Infrastructure**
- **Docker** - Conteneurisation
- **Docker Compose** - Orchestration

## 📱 Pages Disponibles

| Page | URL | Description |
|------|-----|-------------|
| 🏠 Accueil | `/` | Découverte d'événements |
| 🎫 Événement | `/events/[id]` | Détail et réservation |
| 🛒 Panier | Sidebar | Gestion du panier |
| 💳 Checkout | `/checkout` | Process de paiement |
| 🔐 Auth | `/auth` | Login/Register |
| 👨‍💼 Admin | `/admin` | Dashboard admin |
| 🎪 Organisateur | `/organizer` | Dashboard organisateur |

## 🏗️ Architecture

```
src/
├── app/[locale]/              # Pages avec internationalisation
│   ├── admin/                 # Dashboard administrateur
│   ├── organizer/             # Dashboard organisateur  
│   ├── events/[id]/           # Détail événement
│   ├── checkout/              # Process paiement
│   └── auth/                  # Authentification
├── components/                # Composants réutilisables
│   ├── admin/                 # Composants admin
│   ├── organizer/             # Composants organisateur
│   ├── cart/                  # Système panier
│   ├── events/                # Composants événements
│   └── ui/                    # Design system
├── contexts/                  # Contextes React
├── middleware/                # Sécurité
├── services/                  # Logique métier
└── lib/                       # Utilitaires
```

## 🔒 Sécurité

- ✅ **Authentification JWT** sécurisée
- ✅ **Protection des routes** par rôle
- ✅ **Hachage des mots de passe** avec bcrypt
- ✅ **Validation côté serveur** de toutes données
- ✅ **Middleware de sécurité** intégré

## 🧪 Scripts Disponibles

```bash
npm run dev          # Démarrage développement
npm run build        # Build production
npm run start        # Démarrage production
npm run lint         # Vérification code
npm run test         # Tests unitaires

# Base de données
npm run prisma:generate  # Génération client
npm run prisma:migrate   # Migrations
npm run prisma:studio    # Interface graphique

# Docker
npm run docker:up        # Démarrage conteneurs
npm run docker:down      # Arrêt conteneurs
```

## 📊 Statut du Projet

### ✅ **Terminé**
- Interface utilisateur complète
- Dashboards admin/organisateur
- Système d'authentification
- Panier et checkout
- Base de données
- Sécurité et protection
- Design responsive
- Documentation complète

### 🚧 **Améliorations Possibles**
- Intégration Stripe/PayPal
- Notifications email
- QR codes pour billets
- Analytics avancées
- Application mobile (PWA)
- Internationalisation

## 📝 Documentation

- 📋 [Guide de démarrage](GUIDE_DEMARRAGE.md)
- 🏗️ [Architecture technique](ARCHITECTURE.md)
- 📊 [Statut complet](ADMIN_DASHBOARD_STATUS.md)

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez la documentation
2. Consultez les issues GitHub
3. Utilisez les comptes de démonstration

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

**🎉 Votre application de billetterie est prête à l'emploi ! 🎫**
