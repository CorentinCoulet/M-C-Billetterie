# 🎯 AIDE-MÉMOIRE - Terraform & Kubernetes

## 🚀 Démarrage Rapide

```powershell
# Déployer en 1 commande
.\k8s-deploy.ps1 -Action deploy-simple

# Accéder à l'app
kubectl port-forward -n billetterie svc/billetterie-app 3000:3000
# → http://localhost:3000
```

---

## 📊 Monitoring

```powershell
# État complet
.\k8s-deploy.ps1 -Action status

# Logs en temps réel
.\k8s-deploy.ps1 -Action logs

# Métriques CPU/RAM
kubectl top pods -n billetterie

# Liste des pods
kubectl get pods -n billetterie -o wide
```

---

## 🔧 Opérations Courantes

```powershell
# Redémarrer l'app
.\k8s-deploy.ps1 -Action restart

# Scaler à 5 pods
.\k8s-deploy.ps1 -Action scale -Replicas 5

# Voir l'auto-scaling
kubectl get hpa -n billetterie -w

# Mettre à jour l'image
kubectl set image deployment/billetterie-app app=registry/billetterie:v2.0.0 -n billetterie

# Rollback
kubectl rollout undo deployment/billetterie-app -n billetterie
```

---

## 🐛 Debug

```powershell
# Détails d'un pod
kubectl describe pod <pod-name> -n billetterie

# Logs d'un pod crashé
kubectl logs <pod-name> -n billetterie --previous

# Shell dans un pod
kubectl exec -it <pod-name> -n billetterie -- /bin/sh

# Événements récents
kubectl get events -n billetterie --sort-by='.lastTimestamp'

# Tester la connectivité
kubectl run test --image=busybox -n billetterie -- ping billetterie-app
```

---

## 🗄️ Base de Données

```powershell
# Se connecter à PostgreSQL
kubectl exec -it postgres-0 -n billetterie -- psql -U billetterie

# Backup manuel
kubectl create job --from=cronjob/database-backup manual-backup -n billetterie

# Voir les PVC (volumes)
kubectl get pvc -n billetterie
```

---

## 🏗️ Terraform

```powershell
# Initialiser
cd infrastructure/terraform
terraform init

# Planifier (voir sans appliquer)
terraform plan

# Appliquer
terraform apply

# Voir l'état
terraform show

# Outputs
terraform output

# Détruire
terraform destroy
```

---

## 🔐 Secrets

```powershell
# Voir les secrets
kubectl get secrets -n billetterie

# Récupérer un secret
kubectl get secret billetterie-secrets -n billetterie -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Éditer un secret
kubectl edit secret billetterie-secrets -n billetterie

# Après modification, redémarrer
kubectl rollout restart deployment/billetterie-app -n billetterie
```

---

## 🧹 Nettoyage

```powershell
# Arrêter l'app (garde les données)
.\k8s-deploy.ps1 -Action stop

# Supprimer un deployment
kubectl delete deployment billetterie-app -n billetterie

# Supprimer tout (⚠️ ATTENTION)
.\k8s-deploy.ps1 -Action cleanup
```

---

## 🎨 Alias Utiles (à ajouter dans votre profil PowerShell)

```powershell
# Éditer : notepad $PROFILE

# Ajouter ces fonctions :
function k { kubectl $args }
function kgp { kubectl get pods -n billetterie $args }
function kgpw { kubectl get pods -n billetterie -w }
function klogs { kubectl logs -f deployment/billetterie-app -n billetterie }
function kstatus { kubectl get all -n billetterie }

# Utilisation :
# k get pods -A          → kubectl get pods -A
# kgp                    → kubectl get pods -n billetterie
# klogs                  → logs en temps réel
```

---

## 📱 Accès Services

```powershell
# Application Next.js
kubectl port-forward -n billetterie svc/billetterie-app 3000:3000

# PostgreSQL
kubectl port-forward -n billetterie svc/postgres 5432:5432

# Redis
kubectl port-forward -n billetterie svc/redis 6379:6379

# Grafana (monitoring)
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80

# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

---

## 🚨 Urgences

```powershell
# Pod bloqué en "Pending"
kubectl describe pod <pod-name> -n billetterie
# → Regarder "Events" pour voir le problème

# Out of Memory
kubectl top pods -n billetterie
# → Si CPU/RAM à 100%, scaler ou augmenter les resources

# Connexion DB impossible
kubectl get pods -n billetterie | grep postgres
kubectl logs postgres-0 -n billetterie

# Service inaccessible
kubectl get svc -n billetterie
kubectl describe svc billetterie-app -n billetterie
```

---

## 📖 Documentation

- **Quick Start** : [QUICK_START_K8S.md](QUICK_START_K8S.md)
- **Guide Complet** : [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Visual** : [TERRAFORM_K8S_VISUAL.md](TERRAFORM_K8S_VISUAL.md)
- **Terraform** : [docs/TERRAFORM_GUIDE.md](docs/TERRAFORM_GUIDE.md)
- **Kubernetes** : [docs/KUBERNETES_DEPLOYMENT.md](docs/KUBERNETES_DEPLOYMENT.md)

---

**💡 Astuce** : Imprimez cette page et gardez-la à côté de vous !
