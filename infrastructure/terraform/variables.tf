variable "cluster_name" {
  description = "Nom du cluster Kubernetes"
  type        = string
  default     = "billetterie-local"
}

variable "namespace" {
  description = "Namespace Kubernetes"
  type        = string
  default     = "billetterie"
}

variable "domain_name" {
  description = "Nom de domaine de l'application"
  type        = string
  default     = "localhost"
}

variable "environment" {
  description = "Environnement (development, staging, production)"
  type        = string
  default     = "development"
}
