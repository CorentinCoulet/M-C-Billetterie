# 🗄️ Production Database Infrastructure

Cette configuration déploie une infrastructure de base de données PostgreSQL haute disponibilité avec :

- **PostgreSQL Master/Slave** : Réplication streaming pour la haute disponibilité
- **PgBouncer** : Connection pooling pour optimiser les performances 
- **Backups automatisés** : Chiffrés avec rotation et stockage S3
- **Monitoring** : Health checks et métriques de performance

## 📋 Prérequis

- Cluster Kubernetes opérationnel
- `kubectl` configuré
- `helm` installé (pour External Secrets Operator et cert-manager)
- Accès administrateur au cluster
- Optionnel : Credentials AWS S3 pour les backups

## 🚀 Déploiement

### 1. Déploiement automatique

```bash
cd scripts/
./deploy-production-database.sh
```

Le script va :
- ✅ Vérifier la connectivité au cluster
- ✅ Installer External Secrets Operator et cert-manager si nécessaire
- ✅ Générer des mots de passe sécurisés
- ✅ Déployer PostgreSQL Master/Slave + PgBouncer
- ✅ Valider les connexions
- ✅ Sauvegarder les credentials dans `database_passwords.txt`

### 2. Variables d'environnement (optionnel)

```bash
export DATABASE_PASSWORD="votre_mot_de_passe_fort"
export POSTGRES_REPLICATION_PASSWORD="mot_de_passe_replication"
export AWS_ACCESS_KEY_ID="votre_access_key"
export AWS_SECRET_ACCESS_KEY="votre_secret_key"

./deploy-production-database.sh
```

## 🔍 Tests et Validation

```bash
# Test complet de l'infrastructure
./test-database-production.sh

# Monitoring des pods
kubectl get pods -n billetterie -w

# Logs PgBouncer
kubectl logs -f deployment/pgbouncer -n billetterie

# Connexion directe au master
kubectl exec -it <postgres-master-pod> -n billetterie -- psql -U billetterie
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │────│    PgBouncer     │────│ PostgreSQL      │
│                 │    │  (Connection     │    │ Master          │
│                 │    │   Pooling)       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                               │
                                               │ Replication
                                               ▼
                                       ┌─────────────────┐
                                       │ PostgreSQL      │
                                       │ Slave (RO)      │
                                       │                 │
                                       └─────────────────┘
```

## 📊 Endpoints de Connexion

| Service | Endpoint | Port | Usage |
|---------|----------|------|-------|
| **Main** | `postgres.billetterie.svc.cluster.local` | 5432 | **Recommandé** (via PgBouncer) |
| Master | `postgres-master.billetterie.svc.cluster.local` | 5432 | Lecture/Écriture directe |
| Slave | `postgres-slave.billetterie.svc.cluster.local` | 5432 | Lecture seule |
| PgBouncer | `pgbouncer.billetterie.svc.cluster.local` | 6432 | Connection pooling |

## 🔧 Configuration de l'Application

Mettez à jour votre `DATABASE_URL` :

```bash
# Recommandé (via PgBouncer)
DATABASE_URL=postgres://billetterie:PASSWORD@postgres.billetterie.svc.cluster.local:5432/billetterie

# Ou directement sur le master
DATABASE_URL=postgres://billetterie:PASSWORD@postgres-master.billetterie.svc.cluster.local:5432/billetterie
```

## 💾 Système de Backup

### Configuration automatique
- **Fréquence** : Quotidien à 2h du matin
- **Chiffrement** : AES-256-CBC
- **Rétention locale** : 7 jours
- **Rétention S3** : 30 jours
- **Nettoyage** : Automatique le dimanche

### Backup manuel
```bash
# Déclencher un backup immédiatement
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n billetterie

# Voir les backups
kubectl exec -it <postgres-backup-pod> -n billetterie -- ls -la /backup/

# Restaurer un backup (exemple)
kubectl exec -it <postgres-master-pod> -n billetterie -- bash
# Dans le pod :
openssl enc -d -aes-256-cbc -in /backup/backup.sql.enc -out /tmp/restore.sql -k $BACKUP_ENCRYPTION_KEY
psql -U billetterie -d billetterie < /tmp/restore.sql
```

## 📈 Monitoring et Métriques

### Health Checks Disponibles
```bash
# Status général
kubectl get pods -n billetterie

# Health check complet
./test-database-production.sh

# Métriques de performance
kubectl exec -it <postgres-master-pod> -n billetterie -- psql -U billetterie -c "
SELECT 
  pg_size_pretty(pg_database_size('billetterie')) as db_size,
  (SELECT count(*) FROM pg_stat_activity) as connections,
  round((sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read)))::numeric, 2) as cache_hit_ratio
FROM pg_stat_database WHERE datname = 'billetterie';
"
```

### Alertes Recommandées
- Réplication lag > 30 secondes
- Utilisation CPU > 80%
- Utilisation RAM > 85% 
- Échec de backup
- SSL certificate expiration < 30 jours

## 🔒 Sécurité

### Fonctionnalités Implémentées
- ✅ SSL/TLS obligatoire
- ✅ Mots de passe chiffrés (SCRAM-SHA-256)
- ✅ Réseau isolé (NetworkPolicy)
- ✅ Backups chiffrés
- ✅ Rotation automatique des secrets
- ✅ Authentification renforcée

### Configuration des Secrets
```bash
# Via External Secrets Operator (recommandé)
kubectl apply -f k8s/production.yaml

# Ou manuellement (temporaire)
kubectl create secret generic billetterie-secrets -n billetterie \
  --from-literal=DATABASE_PASSWORD="strong_password" \
  --from-literal=POSTGRES_REPLICATION_PASSWORD="replication_password"
```

## 🔧 Maintenance

### Mise à jour PostgreSQL
```bash
# 1. Sauvegarder
kubectl create job --from=cronjob/postgres-backup pre-upgrade-backup -n billetterie

# 2. Mettre à jour l'image dans k8s/production.yaml
# 3. Appliquer
kubectl apply -f k8s/production.yaml

# 4. Vérifier
./test-database-production.sh
```

### Scaling
```bash
# Ajouter des replicas PgBouncer
kubectl scale deployment pgbouncer --replicas=3 -n billetterie

# Ajouter des slaves (modifier le yaml)
# replicas: 2 dans postgres-slave StatefulSet
```

## 🚨 Dépannage

### Problèmes Courants

**Réplication ne fonctionne pas :**
```bash
# Vérifier les logs
kubectl logs postgres-slave-0 -n billetterie

# Vérifier la connectivité
kubectl exec -it postgres-slave-0 -n billetterie -- pg_isready -h postgres-master -U replicator
```

**PgBouncer ne se connecte pas :**
```bash
# Vérifier la config
kubectl describe configmap pgbouncer-config -n billetterie

# Tester la connexion
kubectl exec -it pgbouncer-pod -- psql -h postgres-master -U billetterie -d billetterie
```

**Backups échouent :**
```bash
# Vérifier les logs
kubectl logs job/postgres-backup-<timestamp> -n billetterie

# Vérifier les permissions
kubectl exec -it postgres-master-0 -n billetterie -- psql -U backup_user -c "SELECT 1;"
```

## 📞 Support

Pour les problèmes :
1. Consulter les logs : `kubectl logs <pod> -n billetterie`
2. Vérifier les events : `kubectl get events -n billetterie --sort-by='.lastTimestamp'`
3. Lancer les tests : `./test-database-production.sh`
4. Consulter la documentation PostgreSQL et PgBouncer

---

## 🎯 Prochaines Étapes

Après déploiement :
- [ ] Configurer External Secrets Operator avec votre provider
- [ ] Mettre en place les alertes Prometheus/Grafana
- [ ] Tester la restauration d'un backup
- [ ] Documenter les runbooks pour l'équipe
- [ ] Planifier les tests de failover
