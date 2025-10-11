# ☸️ Déploiement Kubernetes - Billetterie Platform

## 📋 Vue d'ensemble

Ce guide explique comment déployer la plateforme de billetterie sur Kubernetes, en environnement de développement et production.

---

## 🎯 Prérequis

### Outils nécessaires

```bash
# Kubernetes CLI
kubectl version --client

# Terraform (optionnel, pour l'IaC)
terraform version

# Helm (optionnel, pour les charts)
helm version
```

### Cluster Kubernetes

- **Développement** : Minikube, kind, ou Docker Desktop
- **Production** : EKS (AWS), GKE (Google Cloud), AKS (Azure), ou cluster on-premise

---

## 🚀 Déploiement Rapide

### 1. Environnement de Développement

```bash
# Démarrer Minikube
minikube start --cpus=4 --memory=8192

# Activer les addons nécessaires
minikube addons enable ingress
minikube addons enable metrics-server

# Déployer l'application
kubectl apply -f k8s/production.yaml

# Vérifier le déploiement
kubectl get pods -n billetterie
kubectl get services -n billetterie
```

### 2. Environnement de Production

```bash
# Avec les configurations production durcies
kubectl apply -f k8s/production-hardened.yaml

# Vérifier le déploiement
kubectl get pods -n billetterie
kubectl get ingress -n billetterie
```

---

## 🏗️ Architecture Kubernetes

### Structure des Ressources

```
k8s/
├── production.yaml              # Configuration production standard
└── production-hardened.yaml     # Configuration production sécurisée
```

### Composants Déployés

| Ressource | Description | Réplicas |
|-----------|-------------|----------|
| **Deployment** | Application Next.js | 3 |
| **StatefulSet** | PostgreSQL | 1 (primary) + 2 (replicas) |
| **StatefulSet** | Redis | 3 (cluster mode) |
| **Service** | Load Balancer | - |
| **Ingress** | Nginx Ingress | - |
| **ConfigMap** | Configuration | - |
| **Secret** | Credentials | - |
| **PVC** | Stockage persistant | 3 |
| **HPA** | Auto-scaling | 3-10 pods |

---

## 🔐 Configuration des Secrets

### Créer les secrets manuellement

```bash
# Créer le namespace
kubectl create namespace billetterie

# Secret de base de données
kubectl create secret generic billetterie-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@postgres:5432/billetterie" \
  --from-literal=JWT_SECRET="your-jwt-secret-here" \
  --from-literal=REDIS_PASSWORD="your-redis-password" \
  --from-literal=STRIPE_SECRET_KEY="sk_prod_..." \
  --namespace=billetterie

# Secret SSL/TLS (si vous avez des certificats)
kubectl create secret tls ssl-certificates \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=billetterie
```

### Utiliser Terraform pour la génération automatique

```bash
cd infrastructure/terraform

# Initialiser Terraform
terraform init

# Vérifier le plan
terraform plan

# Appliquer la configuration
terraform apply
```

---

## 📊 Monitoring et Observabilité

### Prometheus & Grafana

Les fichiers K8s incluent le déploiement de Prometheus et Grafana :

```bash
# Accéder à Grafana
kubectl port-forward -n monitoring svc/grafana 3001:3000

# Accéder à Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

**Accès** :
- Grafana : http://localhost:3001
- Prometheus : http://localhost:9090

### Logs

```bash
# Logs de l'application
kubectl logs -f -n billetterie deployment/billetterie-app

# Logs PostgreSQL
kubectl logs -f -n billetterie statefulset/postgres

# Logs de tous les pods
kubectl logs -f -n billetterie --all-containers=true
```

### Métriques

```bash
# Utilisation des ressources
kubectl top pods -n billetterie
kubectl top nodes

# État des pods
kubectl get pods -n billetterie -o wide
```

---

## 🔄 Scaling et Haute Disponibilité

### Horizontal Pod Autoscaler (HPA)

L'application utilise HPA pour le scaling automatique :

```yaml
# Configuration HPA (incluse dans production.yaml)
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

### Scaling manuel

```bash
# Augmenter le nombre de réplicas
kubectl scale deployment billetterie-app --replicas=5 -n billetterie

# Vérifier le scaling
kubectl get deployment billetterie-app -n billetterie
```

### Base de données PostgreSQL

PostgreSQL est déployé en mode **Primary-Replica** avec :
- 1 instance primaire (lecture/écriture)
- 2 replicas (lecture seule)
- Réplication streaming automatique

---

## 💾 Sauvegardes et Restauration

### Sauvegarde Automatique

Un CronJob Kubernetes effectue des sauvegardes quotidiennes :

```bash
# Vérifier les CronJobs
kubectl get cronjobs -n billetterie

# Forcer une sauvegarde manuelle
kubectl create job --from=cronjob/database-backup manual-backup-1 -n billetterie
```

### Restauration

```bash
# Se connecter au pod PostgreSQL
kubectl exec -it -n billetterie postgres-0 -- bash

# Restaurer depuis un backup
gunzip -c /backup/backup-YYYYMMDD-HHMMSS.sql.gz | psql -U billetterie -d billetterie
```

---

## 🔧 Maintenance et Opérations

### Mise à jour de l'application

```bash
# Mise à jour avec rolling update (zéro downtime)
kubectl set image deployment/billetterie-app \
  app=your-registry/billetterie:v1.3.0 \
  -n billetterie

# Vérifier le rollout
kubectl rollout status deployment/billetterie-app -n billetterie

# Rollback en cas de problème
kubectl rollout undo deployment/billetterie-app -n billetterie
```

### Mise à jour des ConfigMaps/Secrets

```bash
# Éditer le ConfigMap
kubectl edit configmap billetterie-config -n billetterie

# Redémarrer les pods pour appliquer les changements
kubectl rollout restart deployment/billetterie-app -n billetterie
```

### Health Checks

```bash
# Vérifier la santé de l'application
kubectl get pods -n billetterie

# Décrire un pod en erreur
kubectl describe pod <pod-name> -n billetterie

# Exécuter des commandes dans un pod
kubectl exec -it <pod-name> -n billetterie -- /bin/sh
```

---

## 🛡️ Sécurité

### Network Policies

Les Network Policies limitent la communication entre pods :

```bash
# Vérifier les Network Policies
kubectl get networkpolicies -n billetterie

# Tester la connectivité
kubectl run test-pod --image=busybox -n billetterie -- sleep 3600
kubectl exec -it test-pod -n billetterie -- wget -O- http://billetterie-app:3000/api/health
```

### Pod Security Policies

Les pods s'exécutent avec les restrictions suivantes :
- ❌ Pas de privilèges root
- ❌ Pas d'escalade de privilèges
- ✅ Read-only root filesystem
- ✅ Capacités Linux minimales

### RBAC (Role-Based Access Control)

```bash
# Créer un utilisateur avec accès limité
kubectl create serviceaccount app-reader -n billetterie
kubectl create rolebinding app-reader-binding \
  --clusterrole=view \
  --serviceaccount=billetterie:app-reader \
  --namespace=billetterie
```

---

## 🚨 Dépannage

### Pod en erreur

```bash
# Vérifier les events
kubectl get events -n billetterie --sort-by='.lastTimestamp'

# Logs d'un pod crashé
kubectl logs <pod-name> -n billetterie --previous

# Décrire le pod
kubectl describe pod <pod-name> -n billetterie
```

### Problèmes de réseau

```bash
# Tester la connectivité DNS
kubectl run -it --rm debug --image=busybox -n billetterie -- nslookup billetterie-app

# Tester la connectivité HTTP
kubectl run -it --rm debug --image=curlimages/curl -n billetterie -- \
  curl http://billetterie-app:3000/api/health
```

### Problèmes de stockage

```bash
# Vérifier les PVC
kubectl get pvc -n billetterie

# Décrire un PVC
kubectl describe pvc <pvc-name> -n billetterie
```

---

## 📈 Performance et Optimisation

### Resource Limits

Les pods ont des limites de ressources configurées :

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Optimisations Production

- ✅ **Image Caching** : Utilise des layers Docker optimisés
- ✅ **Node Affinity** : Déploiement sur des nodes dédiés
- ✅ **Pod Disruption Budget** : Garantit la haute disponibilité
- ✅ **Liveness/Readiness Probes** : Health checks automatiques

---

## 🔗 Ressources Supplémentaires

### Documentation Kubernetes

- [Kubernetes Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

### Fichiers de Configuration

- [`k8s/production.yaml`](../k8s/production.yaml) - Configuration production
- [`k8s/production-hardened.yaml`](../k8s/production-hardened.yaml) - Configuration sécurisée
- [`infrastructure/terraform/main.tf`](../infrastructure/terraform/main.tf) - Infrastructure as Code

---

## 📞 Support

Pour des questions spécifiques à Kubernetes :
- **Documentation** : Consultez ce guide et [docs/README.md](./README.md)
- **Issues** : [GitHub Issues](https://github.com/CorentinCoulet/M-C-Billetterie/issues)

---

**Version** : 1.2.0 | **Dernière mise à jour** : 11 Octobre 2025
