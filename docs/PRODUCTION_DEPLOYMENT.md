# 🚀 Guide de Déploiement Production - Billetterie

## Vue d'ensemble

Ce guide décrit le processus complet de déploiement en production de l'application de billetterie, avec tous les correctifs de sécurité et d'infrastructure implémentés.

## ✅ Prérequis

### Outils requis
- Docker (v20.10+)
- Kubernetes CLI (kubectl)
- Helm (v3.0+)
- Node.js (v18+)
- Git

### Environnements externes
- **Base de données PostgreSQL** (production)
- **Redis** (pour le cache distribué et rate limiting)
- **Sentry** (monitoring des erreurs)
- **Secrets Manager** (Azure Key Vault, AWS Secrets Manager, ou HashiCorp Vault)
- **Registry Docker** (pour les images de production)

### Accès requis
- Accès au cluster Kubernetes de production
- Permissions de push vers le registry Docker
- Accès aux services de secrets management
- Certificats SSL valides

## 🔧 Préparation du Déploiement

### 1. Configuration des secrets

Créer un fichier `.env.production` avec toutes les variables d'environnement :

```bash
# Base de données
DATABASE_URL=postgresql://user:password@prod-db.company.com:5432/billetterie

# Redis
REDIS_URL=redis://prod-redis.company.com:6379

# JWT
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters

# Stripe (production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASS=your-smtp-password

# Application
NEXT_PUBLIC_APP_URL=https://tickets.company.com
NODE_ENV=production

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Secrets Management (choisir un provider)
# Azure Key Vault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# OU AWS Secrets Manager
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# OU HashiCorp Vault
VAULT_URL=https://vault.company.com:8200
VAULT_TOKEN=your-vault-token
```

### 2. Configuration Kubernetes

Assurez-vous que le namespace `billetterie` existe :

```bash
kubectl create namespace billetterie
```

Créer les secrets Kubernetes :

```bash
kubectl create secret generic billetterie-secrets \
  --from-env-file=.env.production \
  -n billetterie
```

### 3. Validation pré-déploiement

Exécuter le script de validation :

```bash
node scripts/validate-production.ts
```

Ce script vérifie :
- ✅ Disponibilité de tous les secrets critiques
- ✅ Connexion à la base de données
- ✅ Connexion Redis
- ✅ Configuration de l'environnement
- ✅ Paramètres de sécurité
- ✅ Configuration du monitoring

## 🚀 Processus de Déploiement

### Étape 1: Validation complète

```bash
# Exécuter la validation complète
./scripts/deploy-production.sh production v1.0.0
```

Le script effectue automatiquement :

1. **Validation pré-déploiement** - Vérifie tous les prérequis
2. **Sauvegarde** - Crée un backup de la base de données
3. **Build & Push** - Construit et pousse l'image Docker
4. **Migration** - Exécute les migrations de base de données
5. **Déploiement** - Déploie l'application sur Kubernetes
6. **Vérifications** - Effectue les contrôles de santé post-déploiement
7. **Sécurité** - Vérifie les configurations de sécurité

### Étape 2: Monitoring post-déploiement

Une fois le déploiement terminé, lancer la surveillance :

```bash
# Vérification unique
node scripts/post-deployment-monitor.ts single

# Surveillance continue
node scripts/post-deployment-monitor.ts continuous
```

## 📊 Vérifications Post-Déploiement

### 1. Santé de l'application

```bash
# Vérifier les pods
kubectl get pods -n billetterie

# Vérifier les logs
kubectl logs -f deployment/billetterie-app -n billetterie

# Vérifier les services
kubectl get svc -n billetterie
```

### 2. Tests de santé

```bash
# Health check
curl https://api.tickets.company.com/api/health/live
curl https://api.tickets.company.com/api/health/ready

# Métriques
curl https://api.tickets.company.com/api/metrics

# API de base
curl https://api.tickets.company.com/api/events?limit=1
```

### 3. Sécurité

```bash
# Vérifier les headers de sécurité
curl -I https://api.tickets.company.com/

# Tester les certificats SSL
openssl s_client -connect api.tickets.company.com:443 -servername api.tickets.company.com
```

## 🔄 Procédure de Rollback

En cas de problème critique :

```bash
# Rollback automatique via Kubernetes
kubectl rollout undo deployment/billetterie-app -n billetterie

# Vérifier le statut du rollback
kubectl rollout status deployment/billetterie-app -n billetterie

# Restaurer la base de données si nécessaire
# (utiliser la sauvegarde créée avant le déploiement)
```

## 📈 Monitoring et Alertes

### Métriques disponibles

L'application expose les métriques suivantes via `/api/metrics` :

**Infrastructure :**
- `nodejs_heap_used_bytes` - Utilisation mémoire
- `nodejs_heap_total_bytes` - Mémoire totale allouée
- `process_cpu_user_seconds_total` - CPU utilisateur
- `http_requests_total` - Total des requêtes HTTP
- `http_request_duration_seconds` - Durée des requêtes

**Base de données :**
- `postgres_connections_active` - Connexions actives
- `postgres_connections_idle` - Connexions inactives
- `postgres_query_duration_seconds` - Durée des requêtes

**Business :**
- `events_total` - Nombre total d'événements
- `tickets_sold_total` - Nombre de tickets vendus
- `revenue_total_cents` - Revenus totaux
- `active_users_total` - Utilisateurs actifs

**Sécurité :**
- `rate_limit_hits_total` - Tentatives de rate limiting
- `auth_failures_total` - Échecs d'authentification
- `suspicious_activities_total` - Activités suspectes

### Configuration Prometheus

Ajouter la configuration pour scraper les métriques :

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'billetterie'
    static_configs:
      - targets: ['billetterie-service:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

### Alertes recommandées

```yaml
# alert-rules.yml
groups:
  - name: billetterie
    rules:
      - alert: HighResponseTime
        expr: rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighMemoryUsage
        expr: nodejs_heap_used_bytes / nodejs_heap_total_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
```

## 🛡️ Sécurité en Production

### Features de sécurité activées

1. **Gestion des secrets** - Support multi-provider (Azure, AWS, Vault)
2. **Rate limiting distribué** - Redis avec fallback mémoire
3. **Headers de sécurité** - CSP, HSTS, X-Frame-Options, etc.
4. **Monitoring des erreurs** - Sentry avec sanitisation des données
5. **Health checks** - Endpoints dédiés pour Kubernetes
6. **Métriques complètes** - Monitoring infrastructure et business

### Bonnes pratiques appliquées

- ✅ Secrets jamais en plain text
- ✅ Rate limiting par IP et utilisateur
- ✅ Logs sécurisés (pas de données sensibles)
- ✅ Validation stricte des entrées
- ✅ Headers de sécurité obligatoires
- ✅ Monitoring proactif des anomalies

## 🔧 Maintenance

### Logs essentiels à surveiller

```bash
# Application logs
kubectl logs -f deployment/billetterie-app -n billetterie

# Base de données
kubectl logs -f deployment/postgres -n billetterie

# Redis
kubectl logs -f deployment/redis -n billetterie
```

### Commandes utiles

```bash
# Scaling
kubectl scale deployment billetterie-app --replicas=3 -n billetterie

# Mise à jour d'une image
kubectl set image deployment/billetterie-app billetterie=registry.com/billetterie:v1.0.1 -n billetterie

# Configuration maps
kubectl get configmap -n billetterie
kubectl describe configmap billetterie-config -n billetterie

# Secrets
kubectl get secrets -n billetterie
```

## ⚠️ Troubleshooting

### Problèmes courants

**1. Pod en CrashLoopBackOff**
```bash
kubectl describe pod <pod-name> -n billetterie
kubectl logs <pod-name> -n billetterie --previous
```

**2. Connexion base de données échoue**
- Vérifier DATABASE_URL
- Tester la connectivité réseau
- Vérifier les credentials

**3. Rate limiting trop agressif**
- Ajuster les limites dans `src/middlewares/productionRateLimit.ts`
- Vérifier la connexion Redis

**4. Métriques non disponibles**
- Vérifier l'endpoint `/api/metrics`
- Contrôler les permissions Kubernetes

## 📞 Support

En cas de problème critique en production :

1. Vérifier les métriques et logs
2. Exécuter le monitoring post-déploiement
3. Consulter les alertes Sentry
4. Effectuer un rollback si nécessaire
5. Contacter l'équipe de support avec les logs pertinents

---

## 📋 Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Secrets Kubernetes créés
- [ ] Base de données de production accessible
- [ ] Redis de production accessible
- [ ] Certificats SSL valides
- [ ] Sentry configuré
- [ ] Registry Docker accessible
- [ ] Cluster Kubernetes configuré
- [ ] Script de validation exécuté avec succès
- [ ] Backup de pré-déploiement créé
- [ ] Déploiement réussi
- [ ] Health checks passent
- [ ] Monitoring post-déploiement activé
- [ ] Tests de sécurité validés
- [ ] Équipe notifiée du déploiement

---

*Ce guide couvre l'ensemble des corrections critiques identifiées dans PRODUCTION_TODO.md et garantit un déploiement sécurisé et monitoré de l'application.*
