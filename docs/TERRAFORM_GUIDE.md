# 🏗️ Infrastructure as Code - Terraform

## 📋 Vue d'ensemble

Ce guide explique comment utiliser Terraform pour gérer l'infrastructure Kubernetes de la plateforme de billetterie.

---

## 🎯 Qu'est-ce que Terraform ?

**Terraform** est un outil d'Infrastructure as Code (IaC) qui permet de :
- ✅ **Définir** l'infrastructure dans du code (déclaratif)
- ✅ **Versionner** l'infrastructure avec Git
- ✅ **Automatiser** le déploiement et les mises à jour
- ✅ **Gérer** les dépendances entre ressources
- ✅ **Détecter** les drifts de configuration

### Avantages pour ce projet

| Avantage | Description |
|----------|-------------|
| **Reproductibilité** | Déployer l'infrastructure identique en dev/staging/prod |
| **Sécurité** | Génération automatique de secrets complexes |
| **Documentation** | Le code Terraform documente l'infrastructure |
| **Automatisation** | CI/CD pour l'infrastructure |
| **État centralisé** | Backend S3 pour partager l'état entre équipes |

---

## 🚀 Installation et Prérequis

### Installer Terraform

```bash
# Windows (Chocolatey)
choco install terraform

# MacOS (Homebrew)
brew install terraform

# Linux (apt)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Vérifier l'installation
terraform version
```

### Prérequis

- **Terraform** >= 1.0
- **kubectl** configuré avec accès au cluster
- **Accès AWS S3** pour le backend (state storage)
- **Credentials** pour votre cluster Kubernetes

---

## 📁 Structure du Projet Terraform

```
infrastructure/
└── terraform/
    ├── main.tf                 # Configuration principale
    ├── variables.tf           # Variables (à créer)
    ├── outputs.tf            # Outputs (à créer)
    ├── terraform.tfvars      # Valeurs des variables (à créer, ne pas commit)
    └── helm-values/          # Valeurs Helm (à créer)
        └── prometheus-values.yaml
```

---

## 🔧 Configuration Initiale

### 1. Créer le fichier de variables

Créez `infrastructure/terraform/variables.tf` :

```hcl
variable "cluster_name" {
  description = "Nom du cluster Kubernetes"
  type        = string
  default     = "billetterie-prod"
}

variable "namespace" {
  description = "Namespace Kubernetes"
  type        = string
  default     = "billetterie"
}

variable "domain_name" {
  description = "Nom de domaine de l'application"
  type        = string
}

variable "aws_region" {
  description = "Région AWS pour le backend S3"
  type        = string
  default     = "eu-west-3"
}
```

### 2. Créer le fichier de valeurs

Créez `infrastructure/terraform/terraform.tfvars` :

```hcl
cluster_name = "billetterie-prod"
namespace    = "billetterie"
domain_name  = "tickets.votredomaine.com"
aws_region   = "eu-west-3"
```

⚠️ **IMPORTANT** : Ajoutez `terraform.tfvars` au `.gitignore` !

### 3. Configurer le Backend S3

Avant d'utiliser Terraform, créez le bucket S3 et la table DynamoDB :

```bash
# Créer le bucket S3
aws s3api create-bucket \
  --bucket billetterie-terraform-state \
  --region eu-west-3 \
  --create-bucket-configuration LocationConstraint=eu-west-3

# Activer le versioning
aws s3api put-bucket-versioning \
  --bucket billetterie-terraform-state \
  --versioning-configuration Status=Enabled

# Créer la table DynamoDB pour le lock
aws dynamodb create-table \
  --table-name terraform-lock-table \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-3
```

---

## 🚀 Utilisation de Terraform

### Workflow de base

```bash
# Se placer dans le dossier Terraform
cd infrastructure/terraform

# 1. Initialiser Terraform (à faire une seule fois)
terraform init

# 2. Formatter le code
terraform fmt

# 3. Valider la syntaxe
terraform validate

# 4. Voir le plan d'exécution (sans appliquer)
terraform plan

# 5. Appliquer les changements
terraform apply

# 6. Voir l'état actuel
terraform show

# 7. Détruire l'infrastructure (attention !)
terraform destroy
```

### Commandes avancées

```bash
# Voir les outputs
terraform output

# Voir un output spécifique
terraform output namespace

# Rafraîchir l'état
terraform refresh

# Importer une ressource existante
terraform import kubernetes_namespace.app billetterie

# Voir les ressources gérées
terraform state list

# Voir une ressource spécifique
terraform state show kubernetes_namespace.app
```

---

## 🎯 Ce que Terraform Gère

### Ressources Créées Automatiquement

| Ressource | Description |
|-----------|-------------|
| **Namespace** | Namespace Kubernetes `billetterie` |
| **ConfigMaps** | Configuration de l'application |
| **Secrets** | Credentials générés automatiquement |
| **Network Policies** | Règles de sécurité réseau |
| **Pod Security Policies** | Restrictions de sécurité des pods |
| **TLS Certificates** | Certificats auto-signés (dev/staging) |
| **CronJob** | Sauvegarde automatique de la base de données |
| **Helm Release** | Prometheus + Grafana via Helm |

### Secrets Générés Automatiquement

Terraform génère des secrets complexes pour :
- `JWT_SECRET` (64 caractères)
- `REDIS_PASSWORD` (32 caractères)
- `DB_PASSWORD` (32 caractères)
- `ENCRYPTION_KEY` (32 caractères)
- Certificats TLS auto-signés

---

## 🔐 Gestion des Secrets

### Voir les secrets générés

```bash
# Après avoir appliqué Terraform
terraform output -json

# Récupérer un secret depuis Kubernetes
kubectl get secret billetterie-secrets -n billetterie -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

### Rotation des secrets

Pour regénérer un secret :

```bash
# Taint la ressource random_password
terraform taint random_password.jwt_secret

# Appliquer pour regénérer
terraform apply
```

⚠️ **Attention** : Cela peut casser les sessions utilisateurs actives.

---

## 🔄 Workflow CI/CD avec Terraform

### GitHub Actions (exemple)

```yaml
name: Terraform Deploy

on:
  push:
    branches:
      - main
    paths:
      - 'infrastructure/terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: infrastructure/terraform
      
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
        working-directory: infrastructure/terraform
```

---

## 🛠️ Personnalisation

### Modifier les ressources allouées

Éditez `main.tf` pour ajuster les ressources :

```hcl
# Exemple : Augmenter la taille du cluster Redis
resource "kubernetes_statefulset" "redis" {
  spec {
    replicas = 5  # Au lieu de 3
    
    template {
      spec {
        container {
          resources {
            requests = {
              memory = "1Gi"  # Au lieu de 512Mi
              cpu    = "1000m"
            }
          }
        }
      }
    }
  }
}
```

### Ajouter des modules Terraform

Organisez le code en modules réutilisables :

```
infrastructure/terraform/
├── main.tf
├── modules/
│   ├── database/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── application/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
```

---

## 🚨 Dépannage

### Erreur d'initialisation

```bash
# Réinitialiser le backend
rm -rf .terraform
terraform init -reconfigure
```

### State lock

Si Terraform est bloqué :

```bash
# Forcer le déverrouillage (attention !)
terraform force-unlock <LOCK_ID>
```

### Drift de configuration

Détecter les changements manuels :

```bash
# Comparer l'état avec la réalité
terraform plan -detailed-exitcode
```

---

## 📊 Alternatives et Comparaison

| Outil | Avantages | Inconvénients |
|-------|-----------|---------------|
| **Terraform** | Multi-cloud, déclaratif, mature | Courbe d'apprentissage |
| **kubectl apply** | Simple, natif Kubernetes | Pas de state management |
| **Helm** | Templates, packages | Complexe pour infrastructure |
| **Pulumi** | Langages de programmation | Moins mature |

---

## 🎯 Recommandation

### Utiliser Terraform si :
- ✅ Vous gérez plusieurs environnements (dev/staging/prod)
- ✅ Vous voulez de l'Infrastructure as Code versionné
- ✅ Vous avez besoin de génération automatique de secrets
- ✅ Vous voulez détecter les drifts de configuration
- ✅ Vous prévoyez d'utiliser du multi-cloud

### Ne PAS utiliser Terraform si :
- ❌ Vous déployez sur un seul environnement simple
- ❌ Vous préférez les commandes kubectl directes
- ❌ Vous n'avez pas besoin de reproductibilité
- ❌ Vous voulez juste tester rapidement

### Alternative Simple

Si Terraform semble trop complexe pour vos besoins, utilisez directement :

```bash
# Déploiement simple avec kubectl
kubectl apply -f k8s/production.yaml
```

---

## 📚 Ressources

- [Terraform Documentation](https://www.terraform.io/docs)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [Guide Kubernetes](./KUBERNETES_DEPLOYMENT.md)

---

## 📞 Support

Pour des questions sur Terraform :
- **Documentation** : Consultez [docs/README.md](./README.md)
- **Issues** : [GitHub Issues](https://github.com/CorentinCoulet/M-C-Billetterie/issues)

---

**Décision** : Pour un projet de cette taille, **Terraform est recommandé** si vous prévoyez :
- Multiple environnements
- Automatisation CI/CD
- Gestion d'équipe

Sinon, `kubectl apply` directement suffit largement.

---

**Version** : 1.2.0 | **Dernière mise à jour** : 11 Octobre 2025
