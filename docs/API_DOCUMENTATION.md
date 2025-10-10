# 📚 Documentation API - Billetterie

> Documentation complète de l'API REST de la plateforme de billetterie

![API Version](https://img.shields.io/badge/Version-1.0.0-blue)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📖 Table des matières

- [Introduction](#introduction)
- [Authentification](#authentification)
- [Endpoints](#endpoints)
- [Codes d'erreur](#codes-derreur)
- [Rate Limiting](#rate-limiting)
- [Exemples](#exemples)
- [SDK & Clients](#sdk--clients)

---

## 🎯 Introduction

L'API Billetterie est une API REST complète pour la gestion d'événements et de billets électroniques.

### URLs de base

| Environnement | URL                                   | Description                    |
|---------------|---------------------------------------|--------------------------------|
| Production    | `https://billetterie.app/api`        | Serveur de production          |
| Staging       | `https://staging.billetterie.app/api`| Serveur de staging             |
| Development   | `http://localhost:3000/api`          | Serveur local                  |

### Format des réponses

Toutes les réponses sont au format JSON avec UTF-8 encoding.

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Documentation interactive

- **Swagger UI**: [https://billetterie.app/api-docs](https://billetterie.app/api-docs)
- **OpenAPI JSON**: [https://billetterie.app/api/docs](https://billetterie.app/api/docs)

---

## 🔐 Authentification

L'API utilise **JWT (JSON Web Tokens)** pour l'authentification.

### Obtenir un token

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST https://billetterie.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Réponse:**

```json
{
  "user": {
    "id": "clp1234567890",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Utiliser le token

Incluez le token dans l'header `Authorization` avec le préfixe `Bearer`:

```bash
curl -X GET https://billetterie.app/api/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Rafraîchir le token

**Endpoint:** `POST /api/auth/refresh`

```bash
curl -X POST https://billetterie.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 📡 Endpoints

### Authentification

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| POST    | `/api/auth/register`       | Inscription utilisateur        | ❌   |
| POST    | `/api/auth/login`          | Connexion                      | ❌   |
| POST    | `/api/auth/logout`         | Déconnexion                    | ✅   |
| POST    | `/api/auth/refresh`        | Rafraîchir le token            | ❌   |
| POST    | `/api/auth/forgot-password`| Mot de passe oublié            | ❌   |
| POST    | `/api/auth/reset-password` | Réinitialiser mot de passe     | ❌   |
| POST    | `/api/auth/verify-email`   | Vérifier l'email               | ❌   |

### Événements

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| GET     | `/api/events`              | Liste des événements           | ❌   |
| GET     | `/api/events/:id`          | Détails d'un événement         | ❌   |
| POST    | `/api/events`              | Créer un événement             | ✅   |
| PUT     | `/api/events/:id`          | Modifier un événement          | ✅   |
| DELETE  | `/api/events/:id`          | Supprimer un événement         | ✅   |
| POST    | `/api/events/:id/publish`  | Publier un événement           | ✅   |
| POST    | `/api/events/:id/cancel`   | Annuler un événement           | ✅   |
| GET     | `/api/events/search`       | Rechercher des événements      | ❌   |

### Commandes

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| GET     | `/api/orders`              | Liste des commandes            | ✅   |
| GET     | `/api/orders/:id`          | Détails d'une commande         | ✅   |
| POST    | `/api/orders`              | Créer une commande             | ✅   |
| POST    | `/api/orders/:id/cancel`   | Annuler une commande           | ✅   |
| POST    | `/api/orders/:id/refund`   | Rembourser une commande        | ✅   |

### Billets

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| GET     | `/api/tickets`             | Liste des billets              | ✅   |
| GET     | `/api/tickets/:id`         | Détails d'un billet            | ✅   |
| POST    | `/api/tickets/:id/validate`| Valider un billet (QR)         | ✅   |
| GET     | `/api/tickets/:id/download`| Télécharger un billet PDF      | ✅   |
| POST    | `/api/tickets/:id/transfer`| Transférer un billet           | ✅   |

### Paiements

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| POST    | `/api/payments/intent`     | Créer un PaymentIntent Stripe  | ✅   |
| POST    | `/api/payments/webhook`    | Webhook Stripe                 | ❌   |
| POST    | `/api/payments/refund`     | Rembourser un paiement         | ✅   |

### Utilisateurs

| Méthode | Endpoint                    | Description                    | Auth |
|---------|----------------------------|--------------------------------|------|
| GET     | `/api/users/me`            | Profil utilisateur             | ✅   |
| PUT     | `/api/users/me`            | Modifier le profil             | ✅   |
| DELETE  | `/api/users/me`            | Supprimer le compte            | ✅   |
| GET     | `/api/users/me/orders`     | Commandes de l'utilisateur     | ✅   |
| GET     | `/api/users/me/tickets`    | Billets de l'utilisateur       | ✅   |
| POST    | `/api/users/me/change-password` | Changer mot de passe       | ✅   |

### Organisations

| Méthode | Endpoint                       | Description                    | Auth |
|---------|-------------------------------|--------------------------------|------|
| GET     | `/api/organizations`          | Liste des organisations        | ✅   |
| GET     | `/api/organizations/:id`      | Détails d'une organisation     | ✅   |
| POST    | `/api/organizations`          | Créer une organisation         | ✅   |
| PUT     | `/api/organizations/:id`      | Modifier une organisation      | ✅   |
| DELETE  | `/api/organizations/:id`      | Supprimer une organisation     | ✅   |
| GET     | `/api/organizations/:id/members` | Membres d'une organisation  | ✅   |
| POST    | `/api/organizations/:id/members` | Ajouter un membre           | ✅   |
| DELETE  | `/api/organizations/:id/members/:userId` | Retirer un membre | ✅   |

### Administration

| Méthode | Endpoint                    | Description                    | Auth  |
|---------|----------------------------|--------------------------------|-------|
| GET     | `/api/admin/dashboard`     | Statistiques admin             | ADMIN |
| GET     | `/api/admin/users`         | Liste des utilisateurs         | ADMIN |
| PUT     | `/api/admin/users/:id`     | Modifier un utilisateur        | ADMIN |
| DELETE  | `/api/admin/users/:id`     | Supprimer un utilisateur       | ADMIN |
| GET     | `/api/admin/events`        | Tous les événements            | ADMIN |
| POST    | `/api/admin/events/:id/approve` | Approuver un événement    | ADMIN |
| POST    | `/api/admin/events/:id/reject`  | Rejeter un événement      | ADMIN |

### Monitoring

| Méthode | Endpoint             | Description                    | Auth |
|---------|---------------------|--------------------------------|------|
| GET     | `/api/health`       | Vérification santé système     | ❌   |
| GET     | `/api/metrics`      | Métriques Prometheus           | ✅   |

---

## ❌ Codes d'erreur

L'API utilise les codes HTTP standards avec des codes d'erreur applicatifs pour un débogage précis :

| Code HTTP | Nom                  | Description                                      |
|-----------|----------------------|--------------------------------------------------|
| 200       | OK                   | Requête réussie                                  |
| 201       | Created              | Ressource créée avec succès                      |
| 204       | No Content           | Requête réussie, pas de contenu                  |
| 400       | Bad Request          | Données de requête invalides                     |
| 401       | Unauthorized         | Token manquant ou invalide                       |
| 403       | Forbidden            | Permissions insuffisantes                        |
| 404       | Not Found            | Ressource non trouvée                            |
| 409       | Conflict             | Conflit (ex: email déjà utilisé)                 |
| 422       | Unprocessable Entity | Erreur de validation                             |
| 429       | Too Many Requests    | Rate limit dépassé                               |
| 500       | Internal Server Error| Erreur serveur                                   |
| 503       | Service Unavailable  | Service temporairement indisponible              |

### Format des erreurs

Toutes les erreurs suivent ce format standardisé :

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials provided",
    "details": {
      "field": "email",
      "reason": "Email not found"
    }
  }
}
```

### Codes d'erreur applicatifs

#### 🔐 Authentication & Authorization (AUTH_xxx)

| Code     | HTTP | Description                           |
|----------|------|---------------------------------------|
| AUTH_001 | 401  | Invalid credentials                   |
| AUTH_002 | 401  | Token expired                         |
| AUTH_003 | 401  | Unauthorized access                   |
| AUTH_004 | 403  | Forbidden - insufficient permissions  |
| AUTH_005 | 401  | Token missing                         |
| AUTH_006 | 401  | Token invalid                         |
| AUTH_007 | 403  | Email not verified                    |
| AUTH_008 | 403  | Account disabled                      |

#### 🎫 Tickets (TICKET_xxx)

| Code       | HTTP | Description                           |
|------------|------|---------------------------------------|
| TICKET_001 | 404  | Ticket not found                      |
| TICKET_002 | 400  | Ticket already used                   |
| TICKET_003 | 400  | QR code invalid                       |
| TICKET_004 | 400  | Ticket expired                        |
| TICKET_005 | 400  | Event has passed                      |

#### 🎪 Events (EVENT_xxx)

| Code      | HTTP | Description                           |
|-----------|------|---------------------------------------|
| EVENT_001 | 404  | Event not found                       |
| EVENT_002 | 403  | Event not published                   |
| EVENT_003 | 400  | Event is full                         |
| EVENT_004 | 400  | Event cancelled                       |

#### 📦 Orders (ORDER_xxx)

| Code      | HTTP | Description                           |
|-----------|------|---------------------------------------|
| ORDER_001 | 404  | Order not found                       |
| ORDER_002 | 400  | Order already paid                    |
| ORDER_003 | 400  | Order expired                         |
| ORDER_004 | 400  | Order cancelled                       |

#### 💳 Payments (PAY_xxx)

| Code    | HTTP | Description                           |
|---------|------|---------------------------------------|
| PAY_001 | 402  | Payment failed                        |
| PAY_002 | 500  | Stripe error                          |
| PAY_003 | 400  | Refund failed                         |
| PAY_004 | 400  | Invalid webhook signature             |

#### 👤 Users (USER_xxx)

| Code     | HTTP | Description                           |
|----------|------|---------------------------------------|
| USER_001 | 404  | User not found                        |
| USER_002 | 409  | User already exists                   |

#### ⚠️ Validation (VAL_xxx)

| Code    | HTTP | Description                           |
|---------|------|---------------------------------------|
| VAL_001 | 400  | Validation error                      |

#### 🔧 Generic (GEN_xxx)

| Code    | HTTP | Description                           |
|---------|------|---------------------------------------|
| GEN_001 | 404  | Resource not found                    |
| GEN_002 | 409  | Resource conflict                     |
| GEN_003 | 429  | Rate limit exceeded                   |
| GEN_500 | 500  | Internal server error                 |
| GEN_501 | 500  | Database error                        |

### Exemples de réponses d'erreur

**Erreur d'authentification:**

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid email or password"
  }
}
```

**Erreur de validation:**

```json
{
  "success": false,
  "error": {
    "code": "VAL_001",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Email must be a valid email address"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters"
        }
      ]
    }
  }
}
```

**Ticket déjà utilisé:**

```json
{
  "success": false,
  "error": {
    "code": "TICKET_002",
    "message": "Ticket has already been scanned",
    "details": {
      "scannedAt": "2025-10-09T18:30:00Z",
      "scannedBy": "organizer@example.com"
    }
  }
}
```

---

## 🚦 Rate Limiting

L'API implémente un rate limiting pour prévenir les abus.

### Limites par défaut

| Endpoint Type        | Limite                | Période |
|----------------------|-----------------------|---------|
| Authentication       | 5 requêtes            | 15 min  |
| Payment/Checkout     | 3 requêtes            | 10 min  |
| API Standard         | 100 requêtes          | 15 min  |
| Public Endpoints     | 60 requêtes           | 1 min   |

### Headers de réponse

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696867200
Retry-After: 300
```

### Dépassement de limite

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 5 minutes.",
  "statusCode": 429,
  "retryAfter": 300
}
```

---

## 💡 Exemples

### Créer un événement

```bash
curl -X POST https://billetterie.app/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Concert de Jazz",
    "description": "Un concert exceptionnel avec les meilleurs artistes",
    "date": "2025-12-31T20:00:00Z",
    "endDate": "2025-12-31T23:00:00Z",
    "location": "Olympia, Paris",
    "maxAttendees": 500,
    "price": 45.99,
    "currency": "EUR",
    "category": "Music"
  }'
```

### Rechercher des événements

```bash
curl -X GET "https://billetterie.app/api/events?search=jazz&category=Music&page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Créer une commande

```bash
curl -X POST https://billetterie.app/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "clp1234567890",
    "quantity": 2
  }'
```

### Valider un billet (QR Code)

```bash
curl -X POST https://billetterie.app/api/tickets/clp9876543210/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "QR_abc123def456"
  }'
```

---

## 🔧 SDK & Clients

### JavaScript/TypeScript

```bash
npm install @billetterie/sdk
```

```typescript
import { BilletterieClient } from '@billetterie/sdk';

const client = new BilletterieClient({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://billetterie.app/api',
});

// Récupérer des événements
const events = await client.events.list({
  page: 1,
  limit: 20,
  status: 'PUBLISHED',
});

// Créer une commande
const order = await client.orders.create({
  eventId: 'clp1234567890',
  quantity: 2,
});
```

### Python

```bash
pip install billetterie-sdk
```

```python
from billetterie import BilletterieClient

client = BilletterieClient(
    api_key='YOUR_API_KEY',
    base_url='https://billetterie.app/api'
)

# Récupérer des événements
events = client.events.list(page=1, limit=20, status='PUBLISHED')

# Créer une commande
order = client.orders.create(event_id='clp1234567890', quantity=2)
```

### cURL (Shell)

```bash
# Variables d'environnement
export API_TOKEN="YOUR_TOKEN"
export API_BASE="https://billetterie.app/api"

# Helper function
api_call() {
  curl -H "Authorization: Bearer $API_TOKEN" \
       -H "Content-Type: application/json" \
       "$API_BASE$1"
}

# Utilisation
api_call "/events"
```

---

## 📞 Support

### Documentation

- **Documentation interactive**: https://billetterie.app/api-docs
- **Guides**: https://docs.billetterie.app
- **Changelog API**: https://docs.billetterie.app/changelog

### Aide

- **Email**: support@billetterie.app
- **Discord**: https://discord.gg/billetterie
- **GitHub Issues**: https://github.com/billetterie/api/issues

### Status

- **Status Page**: https://status.billetterie.app
- **Incidents**: https://status.billetterie.app/incidents
- **Maintenance**: https://status.billetterie.app/maintenance

---

## 📄 Licence

MIT License - Voir [LICENSE](../LICENSE) pour plus de détails

---

**Dernière mise à jour:** 9 Octobre 2025  
**Version API:** 1.0.0  
**Statut:** ✅ Stable
