# Terraform configuration for production infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  
  backend "s3" {
    bucket = "billetterie-terraform-state"
    key    = "production/terraform.tfstate"
    region = "eu-west-3"
    encrypt = true
    dynamodb_table = "terraform-lock-table"
  }
}

# Variables
variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "billetterie-prod"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "billetterie"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "tickets.company.com"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# Data sources
data "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = var.namespace
  }
}

# Random passwords generation
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = false
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# TLS certificate
resource "tls_private_key" "app_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "app_cert" {
  private_key_pem = tls_private_key.app_key.private_key_pem
  
  subject {
    common_name  = var.domain_name
    organization = "Billetterie Company"
  }
  
  validity_period_hours = 8760 # 1 year
  
  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
  
  dns_names = [
    var.domain_name,
    "api.${var.domain_name}",
    "admin.${var.domain_name}"
  ]
}

# Kubernetes namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace
    
    labels = {
      name        = var.namespace
      environment = var.environment
      managed-by  = "terraform"
    }
    
    annotations = {
      "scheduler.alpha.kubernetes.io/node-selector" = "node-type=application"
    }
  }
}

# ConfigMaps
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "billetterie-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  
  data = {
    NODE_ENV               = "production"
    PORT                   = "3000"
    LOG_LEVEL             = "warn"
    PROMETHEUS_PORT       = "9090"
    HEALTH_CHECK_PORT     = "9000"
    RATE_LIMIT_ENABLED    = "true"
    RATE_LIMIT_MAX        = "1000"
    RATE_LIMIT_WINDOW_MS  = "900000"
    CSP_ENABLED           = "true"
    CORS_ENABLED          = "true"
    SESSION_TIMEOUT       = "1800"
    MFA_REQUIRED_FOR_ADMIN = "true"
  }
}

# Secrets
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "billetterie-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
    
    annotations = {
      "reloader.stakater.com/match" = "true"
    }
  }
  
  type = "Opaque"
  
  data = {
    DATABASE_URL     = base64encode("postgresql://billetterie:${random_password.db_password.result}@postgres:5432/billetterie")
    DATABASE_PASSWORD = base64encode(random_password.db_password.result)
    JWT_SECRET       = base64encode(random_password.jwt_secret.result)
    REDIS_PASSWORD   = base64encode(random_password.redis_password.result)
    ENCRYPTION_KEY   = base64encode(substr(random_password.jwt_secret.result, 0, 32))
    SESSION_SECRET   = base64encode(random_password.jwt_secret.result)
  }
}

# TLS Secret
resource "kubernetes_secret" "tls_cert" {
  metadata {
    name      = "ssl-certificates"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  
  type = "kubernetes.io/tls"
  
  data = {
    "tls.crt" = base64encode(tls_self_signed_cert.app_cert.cert_pem)
    "tls.key" = base64encode(tls_private_key.app_key.private_key_pem)
  }
}

# Network Policies
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-all"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  
  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

resource "kubernetes_network_policy" "app_policy" {
  metadata {
    name      = "billetterie-network-policy"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  
  spec {
    pod_selector {
      match_labels = {
        app = "billetterie"
      }
    }
    
    policy_types = ["Ingress", "Egress"]
    
    ingress {
      from {
        pod_selector {
          match_labels = {
            app = "nginx-proxy"
          }
        }
      }
      
      ports {
        protocol = "TCP"
        port     = "3000"
      }
    }
    
    egress {
      to {
        pod_selector {
          match_labels = {
            app = "postgres"
          }
        }
      }
      
      ports {
        protocol = "TCP"
        port     = "5432"
      }
    }
    
    egress {
      to {
        pod_selector {
          match_labels = {
            app = "redis"
          }
        }
      }
      
      ports {
        protocol = "TCP"
        port     = "6379"
      }
    }
    
    egress {
      to {}
      
      ports {
        protocol = "TCP"
        port     = "443"
      }
      
      ports {
        protocol = "TCP"
        port     = "80"
      }
      
      ports {
        protocol = "TCP"
        port     = "53"
      }
      
      ports {
        protocol = "UDP"
        port     = "53"
      }
    }
  }
}

# Pod Security Policy
resource "kubernetes_pod_security_policy_v1beta1" "app_psp" {
  metadata {
    name = "billetterie-psp"
  }
  
  spec {
    privileged                 = false
    allow_privilege_escalation = false
    required_drop_capabilities = ["ALL"]
    
    volumes = [
      "configMap",
      "secret",
      "persistentVolumeClaim",
      "emptyDir"
    ]
    
    run_as_user {
      rule = "MustRunAsNonRoot"
    }
    
    fs_group {
      rule = "RunAsAny"
    }
    
    se_linux {
      rule = "RunAsAny"
    }
    
    supplemental_groups {
      rule = "RunAsAny"
    }
  }
}

# Monitoring stack using Helm
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"
  
  create_namespace = true
  
  values = [
    file("${path.module}/helm-values/prometheus-values.yaml")
  ]
  
  set {
    name  = "grafana.adminPassword"
    value = random_password.jwt_secret.result
  }
}

# Backup CronJob
resource "kubernetes_cron_job_v1" "backup" {
  metadata {
    name      = "database-backup"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  
  spec {
    schedule = "0 2 * * *" # Daily at 2 AM
    
    job_template {
      metadata {}
      
      spec {
        template {
          metadata {}
          
          spec {
            restart_policy = "Never"
            
            container {
              name  = "backup"
              image = "postgres:16-alpine"
              
              command = ["/bin/sh"]
              args = [
                "-c",
                <<-EOT
                pg_dump -h postgres -U billetterie -d billetterie | gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
                aws s3 cp /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz s3://billetterie-backups/
                find /backup -name "*.sql.gz" -mtime +7 -delete
                EOT
              ]
              
              env {
                name = "PGPASSWORD"
                value_from {
                  secret_key_ref {
                    name = "billetterie-secrets"
                    key  = "DATABASE_PASSWORD"
                  }
                }
              }
              
              volume_mount {
                name       = "backup-storage"
                mount_path = "/backup"
              }
            }
            
            volume {
              name = "backup-storage"
              persistent_volume_claim {
                claim_name = "backup-pvc"
              }
            }
          }
        }
      }
    }
  }
}

# Outputs
output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "app_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
  sensitive   = false
}

output "monitoring_url" {
  description = "Grafana URL"
  value       = "https://grafana.${var.domain_name}"
  sensitive   = false
}
