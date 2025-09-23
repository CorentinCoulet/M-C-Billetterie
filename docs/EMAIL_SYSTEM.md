# Système d'Email avec Templates Handlebars

## 🎯 Vue d'ensemble

Ce système d'email utilise **Handlebars** pour générer des emails professionnels avec un design responsive et une intégration complète avec le système de billetterie.

## 📁 Structure des fichiers

```
src/
├── services/
│   └── emailService.ts          # Service principal d'envoi d'emails
├── templates/emails/
│   ├── layout.hbs              # Template de base commun
│   ├── welcome.hbs             # Email de bienvenue
│   ├── registration-confirmation.hbs  # Confirmation d'inscription
│   ├── password-reset.hbs      # Réinitialisation de mot de passe
│   ├── order-confirmation.hbs  # Confirmation de commande
│   ├── tickets.hbs            # Envoi des billets avec QR codes
│   └── event-reminder.hbs     # Rappel d'événement
└── config/
    └── emailTemplates.ts      # Configuration et constantes
```

## ✨ Fonctionnalités

### Templates disponibles

- **🎉 Welcome Email** : Email de bienvenue avec code promo
- **✅ Registration Confirmation** : Vérification d'email avec lien sécurisé
- **🔐 Password Reset** : Réinitialisation sécurisée avec info de sécurité
- **📦 Order Confirmation** : Récapitulatif détaillé de commande
- **🎫 Tickets** : Envoi des billets avec QR codes intégrés
- **⏰ Event Reminder** : Rappel d'événement avec checklist

### Helpers Handlebars

- `{{formatDate date}}` - Format français des dates
- `{{formatCurrency amount}}` - Format monétaire en euros
- `{{calculateTotal price quantity}}` - Calcul automatique des totaux
- `{{timeUntilEvent eventDate}}` - Calcul du temps jusqu'à l'événement

### Design et UX

- ✅ **Responsive** : Compatible mobile/desktop/tablette
- ✅ **Accessible** : Contraste et lisibilité optimisés  
- ✅ **Branding cohérent** : Charte graphique de la billetterie
- ✅ **Emojis** : Interface moderne et engageante
- ✅ **Call-to-actions** : Boutons d'action bien visibles

## 🚀 Configuration

### Variables d'environnement

```env
# Configuration SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@domain.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_FROM=noreply@billetterie.com
EMAIL_SECURE=false

# Configuration de l'app
APP_NAME=Billetterie
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPPORT_EMAIL=support@billetterie.com
```

### Installation

```bash
# Les dépendances sont déjà installées
npm install handlebars nodemailer @types/handlebars @types/nodemailer
```

## 📧 Utilisation

### Exemple complet

```typescript
import emailService from '../services/emailService';

// Email de bienvenue
await emailService.sendWelcomeEmail(user, 'WELCOME2024');

// Confirmation de commande
await emailService.sendOrderConfirmationEmail(
  user.email,
  user.name,
  order.id,
  {
    totalAmount: order.total,
    orderDate: order.createdAt,
    tickets: order.tickets.map(t => ({
      name: t.name,
      quantity: t.quantity,
      price: t.price,
      eventName: t.event.name,
      eventDate: t.event.date,
      eventLocation: t.event.location
    }))
  }
);

// Envoi des billets
await emailService.sendTicketEmail(
  user.email,
  user.name,
  order.id,
  ticketsWithQRCodes
);
```

## 🧪 Tests

### Via NPM Scripts

```bash
# Information du système
npm run email:info

# Tests des templates (si SMTP configuré)
npm run test:emails
```

### Via API (développement uniquement)

```bash
# Email de bienvenue
curl -X POST http://localhost:3000/api/test/emails/welcome \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Confirmation de commande
curl -X POST http://localhost:3000/api/test/emails/order-confirmation \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Billets avec QR codes
curl -X POST http://localhost:3000/api/test/emails/tickets \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### Liste des endpoints de test

```
GET  /api/test/emails              # Liste tous les tests disponibles
POST /api/test/emails/welcome      # Test email de bienvenue  
POST /api/test/emails/order-confirmation  # Test confirmation de commande
POST /api/test/emails/tickets      # Test envoi de billets
```

## 🔧 Personnalisation

### Modifier un template

1. Éditez le fichier `.hbs` dans `src/templates/emails/`
2. Utilisez la syntaxe Handlebars pour les variables dynamiques
3. Les styles CSS sont intégrés (inline) pour la compatibilité email

### Ajouter un nouveau template

1. Créez `nouveau-template.hbs` dans `src/templates/emails/`
2. Ajoutez une méthode dans `emailService.ts`
3. Utilisez le template de base `layout.hbs` en remplaçant `{{> content}}`

### Exemple de nouveau template

```handlebars
<!-- src/templates/emails/newsletter.hbs -->
<h1>📰 Newsletter {{monthName}}</h1>

<p>Bonjour <strong>{{userName}}</strong>,</p>

<p>Découvrez les événements du mois :</p>

{{#each events}}
<div class="event-card">
    <h3>{{this.name}}</h3>
    <p>{{formatDate this.date}} - {{this.location}}</p>
    <p>{{formatCurrency this.price}}</p>
</div>
{{/each}}
```

## 🎯 Intégration avec le système existant

### QR Codes
- Intégration automatique avec `ticketQRService.ts`
- Rotation automatique des QR codes toutes les 12h
- Validation sécurisée à l'entrée des événements

### Base de données
- Compatible avec le schéma Prisma existant
- Utilise les types TypeScript définis
- Gestion automatique des relations (User, Order, Ticket, Event)

### Sécurité
- Templates protégés contre l'injection XSS
- Validation des données d'entrée
- Emails de sécurité (reset password) avec informations détaillées

## 🚀 Performance

- **Cache des templates** : Templates compilés mis en cache
- **Helpers optimisés** : Calculs rapides côté serveur
- **Images optimisées** : Logos et assets compressés
- **Inline CSS** : Styles intégrés pour performance email

## 📱 Responsive Design

```css
/* Breakpoints intégrés dans les templates */
@media only screen and (max-width: 600px) {
  .container { width: 100% !important; }
  .button { display: block !important; width: 100% !important; }
  .two-column { width: 100% !important; }
}
```

## 🔄 Maintenance

### Logs et monitoring
- Tous les envois sont loggés
- Erreurs capturées et reportées
- Statistiques d'envoi disponibles

### Mise à jour des templates
- Modification à chaud sans redémarrage
- Templates versionnés avec Git
- Rollback possible en cas de problème

## 🎊 Statut actuel

✅ **Système complet et prêt pour la production**

- [x] 7 templates professionnels créés
- [x] Service email intégré avec Handlebars  
- [x] Cache de performance implémenté
- [x] Helpers pour formatting automatique
- [x] Design responsive pour tous appareils
- [x] Intégration QR codes sécurisés
- [x] Routes API de test en développement
- [x] Documentation complète
- [x] Variables d'environnement configurées
- [x] Compatibilité avec le système existant

Le système d'email est maintenant **pleinement opérationnel** et s'intègre parfaitement avec votre plateforme de billetterie ! 🎉
