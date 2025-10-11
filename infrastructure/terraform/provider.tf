# Configuration du provider Kubernetes
# Utilise le fichier kubeconfig par défaut (~/.kube/config)
# Compatible avec Docker Desktop Kubernetes

provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}
