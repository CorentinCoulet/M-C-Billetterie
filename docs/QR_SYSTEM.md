# 🎫 Système de QR Codes - Documentation

## Vue d'ensemble

Le système de QR codes de la billetterie permet de générer, valider et gérer des codes QR pour les tickets d'événements avec des fonctionnalités avancées de sécurité et de rotation automatique.

## 🏗️ Architecture

### Services
- **`TicketService`** (`src/services/ticketQRService.ts`) - Service principal pour la gestion des tickets et QR codes
- **`QRRotationService`** (`src/services/qrRotationService.ts`) - Service de rotation automatique des QR codes

### Routes API
- `POST /api/tickets/validate` - Validation de QR codes
- `GET /api/tickets/[id]/qrcode` - Génération de QR code pour un ticket
- `POST /api/tickets/[id]/regenerate-qr` - Régénération forcée de QR code
- `GET /api/events/[id]/scan-stats` - Statistiques de scan pour un événement
- `GET /api/events/[id]/scanned-tickets` - Tickets scannés pour un événement
- `GET /api/admin/qr-rotation` - Statistiques de rotation
- `POST /api/admin/qr-rotation` - Exécution manuelle de la rotation

## 🔐 Sécurité

### Structure du QR Code
Chaque QR code contient :
```json
{
  "ticketId": "uuid",
  "eventId": "uuid", 
  "userId": "uuid",
  "orderId": "uuid",
  "eventTitle": "Nom de l'événement",
  "eventDate": "2025-01-01T00:00:00.000Z",
  "issuedAt": "2025-01-01T00:00:00.000Z",
  "token": "sha256_hash",
  "checksum": "md5_hash",
  "ticketCode": "TKABCD123"
}
```

### Mécanismes de sécurité
1. **Token unique** - Hash SHA256 basé sur ticket, order, user et timestamp
2. **Checksum** - Hash MD5 pour vérifier l'intégrité
3. **Rotation automatique** - QR codes expirés après 12h (configurable)
4. **Validation stricte** - Vérification de correspondance avec la base de données
5. **Usage unique** - Tickets marqués comme "scannés" après utilisation

## 🔄 Rotation Automatique

### Principe
- Les QR codes expirent après un intervalle configurable (défaut: 12h)
- Un service de rotation vérifie périodiquement les tickets nécessitant une régénération
- Seuls les tickets non-scannés et pour des événements futurs sont traités

### Configuration
- `qrRotationInterval` dans le modèle Ticket (en heures)
- Script cron automatique : `npm run qr:rotate`

### Déclenchement manuel
```bash
# Via API
curl -X POST http://localhost:3000/api/admin/qr-rotation

# Via script
npm run qr:rotate
```

## 📊 Statistiques et Monitoring

### Métriques disponibles
- Nombre total de tickets
- Tickets scannés vs non-scannés
- Pourcentage de scan par événement
- QR codes expirés nécessitant une rotation

### Surveillance
- Logs détaillés pour chaque opération
- Statistiques temps réel via API
- Suivi des erreurs et échecs

## 🚀 Utilisation

### 1. Générer un QR Code
```typescript
import ticketService from './src/services/ticketQRService';

const ticket = await ticketService.createTicket({
  eventId: 'event-uuid',
  userId: 'user-uuid',
  seatNumber: 'A1'
});

const qrResult = await ticketService.generateTicketQRCode(ticket.id);
console.log(qrResult.qrCodeDataUrl); // Data URL de l'image QR
```

### 2. Valider un QR Code
```typescript
// Validation simple (sans marquer comme utilisé)
const validation = await ticketService.validateTicketQRCode(qrContent, false);

if (validation.valid) {
  console.log('Ticket valide');
  if (validation.isAlreadyScanned) {
    console.log('Déjà scanné');
  }
}

// Validation avec marquage comme utilisé
const validationWithUsage = await ticketService.validateTicketQRCode(qrContent, true);
```

### 3. Obtenir les statistiques
```typescript
// Stats de scan pour un événement
const stats = await ticketService.getEventScanStats(eventId);
console.log(`${stats.scanPercentage}% des tickets ont été scannés`);

// Tickets scannés
const scannedTickets = await ticketService.getScannedTicketsForEvent(eventId);
```

## 🛠️ Tests

### Test complet du système
```bash
npm run test:qr
```

Ce script teste :
- Création de tickets
- Génération de QR codes
- Validation des QR codes
- Marquage comme utilisé
- Statistiques de scan
- Système de rotation

### Test unitaire d'un QR code
```bash
# Test via API
curl -X POST http://localhost:3000/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{"qrContent": "{\"ticketId\":\"...\",\"token\":\"...\"}", "markAsUsed": true}'
```

## 📱 Intégration Frontend

### Scanner de QR Code
```typescript
// Exemple d'utilisation côté client
async function validateTicket(qrContent: string, markAsUsed: boolean = false) {
  const response = await fetch('/api/tickets/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrContent, markAsUsed })
  });
  
  const result = await response.json();
  return result;
}
```

### Affichage de QR Code
```typescript
// Récupération du QR code pour un ticket
async function getTicketQRCode(ticketId: string) {
  const response = await fetch(`/api/tickets/${ticketId}/qrcode`);
  const result = await response.json();
  
  if (result.success) {
    // result.qrCode contient l'URL de données de l'image
    return result.qrCode;
  }
}
```

## 🔧 Configuration

### Variables d'environnement
```env
# Taille du QR code (pixels)
QR_CODE_SIZE=200

# Marge du QR code
QR_CODE_MARGIN=4

# Intervalle de rotation par défaut (heures)
DEFAULT_QR_ROTATION_INTERVAL=12
```

### Personnalisation
- Couleurs des QR codes configurables
- Niveau de correction d'erreur ajustable
- Format de sortie configurable (PNG, SVG, etc.)

## 🚨 Gestion d'erreurs

### Codes d'erreur courants
- `400` - QR code mal formaté
- `404` - Ticket non trouvé
- `409` - Ticket déjà scanné
- `410` - QR code expiré
- `500` - Erreur serveur

### Récupération d'erreur
- QR codes corrompus → Régénération automatique
- Tickets perdus → Récupération via email/ID
- Erreurs de réseau → Retry automatique

## 📅 Maintenance

### Tâches périodiques
1. **Rotation des QR codes** - Toutes les heures via cron
2. **Nettoyage des données** - Suppression des anciens tokens
3. **Monitoring** - Surveillance des métriques
4. **Backups** - Sauvegarde des codes de tickets critiques

### Script de maintenance
```bash
# Nettoyage des anciennes données QR
npm run qr:cleanup

# Vérification de l'intégrité
npm run qr:verify

# Rapport de santé
npm run qr:health-check
```

## 🎯 Bonnes Pratiques

1. **Sécurité**
   - Toujours valider côté serveur
   - Ne jamais faire confiance aux données client
   - Logger toutes les validations

2. **Performance** 
   - Cache les QR codes générés
   - Batch les opérations de rotation
   - Utiliser des index de base de données

3. **UX**
   - Feedback immédiat sur scan
   - Mode offline pour événements
   - Regeneration automatique en cas d'erreur

4. **Monitoring**
   - Alertes sur taux d'échec élevé
   - Monitoring des performances de scan
   - Suivi des tentatives de fraude

## 📈 Métriques de Performance

### Objectifs
- **Génération QR** : < 100ms
- **Validation QR** : < 50ms
- **Disponibilité** : > 99.9%
- **Taux d'erreur** : < 0.1%

### Surveillance
- Temps de réponse moyen
- Taux de succès des validations
- Nombre de régénérations par heure
- Détection d'anomalies
