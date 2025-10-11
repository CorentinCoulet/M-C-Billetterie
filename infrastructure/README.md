# 🏗️ Infrastructure

Ce dossier contient les configurations d'infrastructure pour déployer l'application sur Kubernetes.

## 📁 Structure

```
infrastructure/
└── terraform/
    ├── main.tf                       # Configuration principale
    ├── variables.tf                  # Variables Terraform
    ├── provider.tf                   # Configuration des providers
    ├── terraform.tfvars.example      # Exemple de configuration
    └── helm-values/
        └── prometheus-values.yaml    # Configuration monitoring
```

## 🚀 Utilisation

### Déploiement Local (Docker Desktop)

```powershell
# 1. Copier le fichier d'exemple
cp terraform.tfvars.example terraform.tfvars

# 2. Initialiser Terraform
terraform init

# 3. Voir ce qui va être créé
terraform plan

# 4. Appliquer la configuration
terraform apply
```

### Ce que Terraform crée

- ✅ **Namespace** Kubernetes `billetterie`
- ✅ **Secrets** générés automatiquement (JWT, Redis, DB)
- ✅ **ConfigMaps** avec la configuration de l'application
- ✅ **Network Policies** pour la sécurité réseau
- ✅ **TLS Certificates** auto-signés
- ✅ **Monitoring** (Prometheus + Grafana via Helm)
- ✅ **Backup CronJob** pour PostgreSQL

## 🎯 Commandes Utiles

```powershell
# Voir l'état actuel
terraform show

# Voir les outputs (URLs, secrets, etc.)
terraform output

# Rafraîchir l'état
terraform refresh

# Détruire l'infrastructure
terraform destroy
```

## 📚 Documentation

- [Guide Terraform complet](../docs/TERRAFORM_GUIDE.md)
- [Guide Kubernetes](../docs/KUBERNETES_DEPLOYMENT.md)
- [Guide de déploiement](../DEPLOYMENT_GUIDE.md)

## 🔐 Sécurité

⚠️ **IMPORTANT** : Ne commitez jamais `terraform.tfvars` qui contient des informations sensibles !

Le fichier est déjà dans `.gitignore`.
