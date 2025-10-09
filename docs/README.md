# 📚 Documentation - Billetterie Platform

## Vue d'ensemble

Cet   ```bash
   yarn dev
   ```

2. Tests :
   ```bash
   yarn test
   yarn test:qr
   yarn email:info
   ```tation couvre tous les aspects techniques de la plateforme de billetterie Next.js.

## 📋 Documents disponibles

### 🎯 Systèmes principaux

| Document | Description | Statut |
|----------|-------------|--------|
| [**QR_SYSTEM.md**](./QR_SYSTEM.md) | Système de QR codes sécurisés avec rotation | ✅ Complet |
| [**EMAIL_SYSTEM.md**](./EMAIL_SYSTEM.md) | Templates emails Handlebars et service SMTP | ✅ Complet |
| [**SECURITY.md**](./SECURITY.md) | Sécurité, authentification et protection | ✅ Complet |

### 🏗️ Architecture

- **Framework** : Next.js 15 avec App Router
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : JWT avec sessions sécurisées
- **Paiements** : Intégration Stripe
- **Conteneurisation** : Docker + Docker Compose
- **Monitoring** : Prometheus + Grafana

### 🔧 Fonctionnalités implémentées

#### ✅ Système de billetterie
- Gestion des événements et billets
- Système de commandes avec Stripe
- QR codes sécurisés avec rotation automatique
- Validation d'entrée temps réel

#### ✅ Système d'emails
- Templates Handlebars professionnels
- 7 types d'emails automatisés
- Design responsive mobile/desktop
- Intégration QR codes dans emails

#### ✅ Sécurité
- Authentification JWT sécurisée
- Protection CSRF et XSS
- Rate limiting par IP
- WAF (Web Application Firewall)
- Chiffrement des données sensibles

#### ✅ Infrastructure
- Déploiement Docker multi-environnement
- Pipeline CI/CD avec GitHub Actions
- Monitoring avec alertes automatiques
- Sauvegarde automatisée des données

### 🚀 Quick Start

> **⚠️ IMPORTANT : Utiliser YARN uniquement - npm n'est pas supporté**

1. **Installation**
   ```bash
   git clone <repo>
   cd billetterie
   yarn install  # Utiliser UNIQUEMENT yarn
   cp .env.example .env
   ```

2. **Base de données**
   ```bash
   yarn db:migrate
   yarn db:generate
   ```

3. **Développement**
   ```bash
   yarn dev
   ```

4. **Tests**
   ```bash
   yarn test
   yarn test:qr
   yarn email:info
   ```

### 🔍 Scripts utiles

| Script | Description |
|--------|-------------|
| `yarn test:qr` | Test du système QR codes |
| `yarn qr:rotate` | Rotation manuelle QR codes |
| `yarn email:info` | Information système email |
| `yarn test:emails` | Test des templates email |

### 🌐 API Endpoints

#### Publiques
- `GET /api/events` - Liste des événements
- `POST /api/orders` - Création commande
- `POST /api/payments/stripe` - Paiement Stripe

#### QR Codes
- `POST /api/qr/validate` - Validation QR code
- `GET /api/qr/stats` - Statistiques QR
- `POST /api/qr/rotate` - Rotation manuelle

#### Tests (dev only)
- `GET /api/test/emails` - Tests emails
- `POST /api/test/emails/welcome` - Test email bienvenue

### 📊 Monitoring

- **Prometheus** : Métriques système et application
- **Grafana** : Dashboards et visualisations
- **Logs** : Pino avec rotation automatique
- **Alertes** : Email et webhooks Discord/Slack

### 🔐 Variables d'environnement

Les variables critiques à configurer :

```env
# Base de données
DATABASE_URL=postgresql://...

# JWT & Sessions
JWT_SECRET=...
SESSION_SECRET=...

# Stripe
STRIPE_PUBLIC_KEY=pk_...
STRIPE_SECRET_KEY=sk_...

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=...
EMAIL_PASSWORD=...

# QR Codes
QR_ROTATION_SECRET=...
```

### 🏃‍♂️ Déploiement

#### Production avec Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes
```bash
kubectl apply -f k8s/production.yaml
```

### 🆘 Support et maintenance

- **Logs** : `./monitoring/` pour tous les logs système
- **Backups** : Automatiques quotidiens PostgreSQL
- **Updates** : Patches sécurité appliqués automatiquement
- **Monitoring** : Alertes 24/7 pour les incidents

### 📈 Roadmap

#### 🔄 En cours
- [ ] Système de notifications push
- [ ] API mobile React Native
- [ ] Multi-langue (i18n)

#### 🎯 Planifié
- [ ] Programme de fidélité
- [ ] Analytics avancés
- [ ] IA pour recommandations événements
- [ ] Intégration réseaux sociaux

---

## 📞 Contact et contribution

Pour toute question technique ou contribution :

1. **Issues** : GitHub Issues pour bugs et features
2. **Discussions** : GitHub Discussions pour questions
3. **Security** : `security@billetterie.com` pour vulnérabilités
4. **Support** : `support@billetterie.com` pour assistance

---

**🎊 Plateforme de billetterie complète et prête pour la production !**
