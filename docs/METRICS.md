# Système de Métriques Prometheus

## Vue d'ensemble

Ce système collecte des métriques détaillées pour le monitoring et l'alerting en production. Il utilise Prometheus avec `prom-client` pour Node.js.

## Fonctionnalités

### Métriques HTTP
- **Requêtes totales** : Nombre total de requêtes HTTP par méthode, route et code de statut
- **Durée des requêtes** : Distribution des temps de réponse

### Métriques Base de Données
- **Connexions actives** : Nombre de connexions à la base de données
- **Durée des requêtes** : Performance des requêtes par opération et table
- **Erreurs** : Erreurs de base de données par type

### Métriques Métier
- **Utilisateurs** : Nombre total d'utilisateurs inscrits
- **Événements** : Nombre d'événements créés
- **Tickets** : Création et vente de tickets
- **Commandes** : Suivi des commandes par statut
- **Revenue** : Chiffre d'affaires par devise

### Métriques Sécurité
- **Tentatives d'authentification** : Succès/échecs par méthode
- **Événements sécuritaires** : Classification par type et gravité
- **Rate limiting** : Hits et dépassements de limites

### Métriques Système
- **Santé de l'application** : État général du système
- **Usage mémoire** : Utilisation de la RAM
- **Usage CPU** : Pourcentage d'utilisation
- **Cache** : Hits et miss du cache

## Utilisation

### Endpoint de métriques
```
GET /api/metrics
```
Retourne les métriques au format Prometheus pour le scraping.

### API Programmatique

```typescript
import MetricsCollector from '../path/to/metrics/route';

// Enregistrer une requête HTTP
MetricsCollector.recordHttpRequest('GET', '/api/users', 200, 150);

// Enregistrer un paiement
MetricsCollector.recordPayment('stripe', 2500, 'EUR', 'success');

// Enregistrer un événement de sécurité
MetricsCollector.recordSecurityEvent('rate_limit_exceeded', 'high');

// Mettre à jour la santé de l'application
MetricsCollector.setAppHealth(true);
```

### Configuration Prometheus

```yaml
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: 'billetterie'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 30s
    metrics_path: '/api/metrics'
```

## Métriques Disponibles

### Compteurs (Counter)
- `billetterie_http_requests_total`
- `billetterie_tickets_created_total`
- `billetterie_tickets_sold_total`
- `billetterie_revenue_total`
- `billetterie_orders_total`
- `billetterie_auth_attempts_total`
- `billetterie_payments_total`
- `billetterie_security_events_total`
- `billetterie_rate_limit_hits_total`
- `billetterie_cache_hits_total`
- `billetterie_qr_codes_generated_total`
- `billetterie_emails_sent_total`
- `billetterie_errors_total`

### Jauges (Gauge)
- `billetterie_database_connections_active`
- `billetterie_users_total`
- `billetterie_events_total`
- `billetterie_active_user_sessions`
- `billetterie_health_check_status`
- `billetterie_app_health_status`
- `billetterie_memory_usage_bytes`
- `billetterie_cpu_usage_percent`

### Histogrammes (Histogram)
- `billetterie_http_request_duration_seconds`
- `billetterie_database_query_duration_seconds`
- `billetterie_payment_amount`

## Configuration des Alertes

### Exemple de règles d'alerte Prometheus

```yaml
groups:
  - name: billetterie
    rules:
      - alert: HighErrorRate
        expr: rate(billetterie_http_requests_total{status_code!~"2.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Taux d'erreur élevé détecté"

      - alert: DatabaseConnectionsHigh
        expr: billetterie_database_connections_active > 80
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Trop de connexions à la base de données"

      - alert: AppHealthDown
        expr: billetterie_app_health_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application en panne"
```

## Déploiement

Le système démarre automatiquement en mode production. Pour l'arrêter manuellement :

```typescript
import { stopMetricsCollection } from '../path/to/metrics/route';

stopMetricsCollection();
```

## Monitoring

Surveillez ces métriques clés :
- Temps de réponse des requêtes HTTP
- Taux d'erreur des paiements
- Événements de sécurité critiques
- Santé générale de l'application
- Utilisation des ressources système
