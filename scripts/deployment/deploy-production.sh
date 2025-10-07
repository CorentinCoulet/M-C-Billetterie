#!/bin/bash

# Production Deployment Script for Billetterie
# This script handles secure deployment to production environment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check if running in production mode
if [ "$ENVIRONMENT" = "production" ]; then
    warning "⚠️  PRODUCTION DEPLOYMENT DETECTED ⚠️"
    echo "This will deploy to the production environment."
    echo "Make sure you have:"
    echo "  ✓ Tested in staging environment"
    echo "  ✓ Database backups are current"
    echo "  ✓ Rollback plan is ready"
    echo ""
    read -p "Continue with production deployment? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        error "Production deployment cancelled by user"
    fi
fi

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Run production validation script
    log "Running comprehensive production validation..."
    if ! node "$PROJECT_ROOT/scripts/validate-production.ts"; then
        error "Production validation failed. Please fix critical issues before deployment."
    fi
    success "Production validation passed"
    
    # Check required tools
    local required_tools=("docker" "kubectl" "helm" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done
    
    # Check environment files
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
            error "Production environment file (.env.production) not found"
        fi
    fi
    
    # Check Kubernetes context
    local current_context=$(kubectl config current-context)
    if [ "$ENVIRONMENT" = "production" ] && [[ ! "$current_context" =~ production|prod ]]; then
        warning "Kubernetes context '$current_context' doesn't appear to be production"
        read -p "Continue anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            error "Deployment cancelled due to context mismatch"
        fi
    fi
    
    success "Pre-deployment checks passed"
}

# Build and push Docker image
build_and_push_image() {
    log "Building Docker image..."
    
    local image_name="billetterie"
    local registry="${DOCKER_REGISTRY:-your-registry.com}"
    local full_image_name="$registry/$image_name:$VERSION"
    
    # Build image
    docker build \
        -f "$PROJECT_ROOT/docker/Dockerfile.prod" \
        -t "$full_image_name" \
        "$PROJECT_ROOT"
    
    # Security scan (if tools available)
    if command -v trivy &> /dev/null; then
        log "Scanning image for vulnerabilities..."
        trivy image "$full_image_name"
    fi
    
    # Push to registry
    log "Pushing image to registry..."
    docker push "$full_image_name"
    
    success "Image built and pushed: $full_image_name"
}

# Database migration
run_database_migration() {
    log "Running database migrations..."
    
    # Create a job pod for migration
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: billetterie-migrate-$(date +%s)
  namespace: billetterie
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: $registry/billetterie:$VERSION
        command: ["yarn", "prisma:migrate:deploy"]
        envFrom:
        - secretRef:
            name: billetterie-secrets
        - configMapRef:
            name: billetterie-config
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for migration to complete
    local job_name=$(kubectl get jobs -n billetterie --sort-by=.metadata.creationTimestamp -o name | tail -1)
    kubectl wait --for=condition=complete --timeout=300s "$job_name" -n billetterie
    
    success "Database migration completed"
}

# Deploy application
deploy_application() {
    log "Deploying application to $ENVIRONMENT..."
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/production.yaml"
    
    # Update image in deployment
    kubectl set image deployment/billetterie-app billetterie="$registry/billetterie:$VERSION" -n billetterie
    
    # Wait for rollout
    kubectl rollout status deployment/billetterie-app -n billetterie --timeout=600s
    
    success "Application deployment completed"
}

# Health checks
post_deployment_checks() {
    log "Running post-deployment health checks..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=billetterie -n billetterie --timeout=300s
    
    # Check application health
    local app_url="https://api.tickets.company.com"
    if [ "$ENVIRONMENT" != "production" ]; then
        app_url="http://localhost:3000"
        # Port forward for testing
        kubectl port-forward svc/billetterie-service 3000:3000 -n billetterie &
        local port_forward_pid=$!
        sleep 5
    fi
    
    # Health check
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/health" || echo "000")
    if [ "$health_response" != "200" ]; then
        error "Health check failed: HTTP $health_response"
    fi
    
    # API check
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" "$app_url/api/health" || echo "000")
    if [ "$api_response" != "200" ]; then
        error "API health check failed: HTTP $api_response"
    fi
    
    # Kill port forward if started
    if [ -n "${port_forward_pid:-}" ]; then
        kill $port_forward_pid 2>/dev/null || true
    fi
    
    success "Post-deployment health checks passed"
}

# Security verification
verify_security() {
    log "Running security verification..."
    
    # Check SSL certificates
    if [ "$ENVIRONMENT" = "production" ]; then
        local ssl_check=$(echo | openssl s_client -connect api.tickets.company.com:443 -servername api.tickets.company.com 2>/dev/null | openssl x509 -noout -dates)
        log "SSL certificate info: $ssl_check"
    fi
    
    # Check security headers
    local headers=$(curl -s -I "$app_url" || echo "")
    if [[ ! "$headers" =~ "Strict-Transport-Security" ]]; then
        warning "HSTS header not found"
    fi
    if [[ ! "$headers" =~ "X-Content-Type-Options" ]]; then
        warning "X-Content-Type-Options header not found"
    fi
    
    # Run security scan if available
    if command -v nmap &> /dev/null; then
        local target_host="api.tickets.company.com"
        if [ "$ENVIRONMENT" != "production" ]; then
            target_host="localhost"
        fi
        nmap -sS -O "$target_host" > "/tmp/security-scan-$ENVIRONMENT.txt" 2>/dev/null || true
        log "Security scan completed, results saved to /tmp/security-scan-$ENVIRONMENT.txt"
    fi
    
    success "Security verification completed"
}

# Backup current state
create_backup() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Creating pre-deployment backup..."
        
        # Database backup
        kubectl exec -n billetterie deploy/postgres -- pg_dump -U billetterie billetterie | \
            gzip > "/tmp/pre-deployment-backup-$(date +%Y%m%d-%H%M%S).sql.gz"
        
        # Upload to S3 if configured
        if [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
            aws s3 cp "/tmp/pre-deployment-backup-$(date +%Y%m%d-%H%M%S).sql.gz" \
                "s3://$AWS_S3_BACKUP_BUCKET/pre-deployment/"
        fi
        
        success "Backup created and stored"
    fi
}

# Rollback function
rollback() {
    error_msg="$1"
    warning "Deployment failed: $error_msg"
    warning "Initiating rollback..."
    
    # Rollback Kubernetes deployment
    kubectl rollout undo deployment/billetterie-app -n billetterie
    kubectl rollout status deployment/billetterie-app -n billetterie --timeout=300s
    
    warning "Rollback completed. Please check the logs and fix issues before redeploying."
    exit 1
}

# Main deployment function
main() {
    log "🚀 Starting deployment to $ENVIRONMENT environment (version: $VERSION)"
    
    # Trap errors for rollback
    trap 'rollback "Unexpected error occurred"' ERR
    
    # Run deployment steps
    pre_deployment_checks
    create_backup
    build_and_push_image
    run_database_migration
    deploy_application
    post_deployment_checks
    verify_security
    
    # Remove error trap
    trap - ERR
    
    success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    
    # Print useful information
    echo ""
    log "📋 Deployment Summary:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Version: $VERSION"
    echo "  Deployed at: $(date)"
    echo "  Kubernetes namespace: billetterie"
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  Application URL: https://tickets.company.com"
        echo "  API URL: https://api.tickets.company.com"
        echo "  Monitoring: https://grafana.company.com"
    fi
    echo ""
    log "📊 Next steps:"
    echo "  - Monitor application logs: kubectl logs -f deployment/billetterie-app -n billetterie"
    echo "  - Check metrics: kubectl port-forward svc/billetterie-service 9090:9090 -n billetterie"
    echo "  - Run health check: curl https://api.tickets.company.com/health"
    echo "  - View pods: kubectl get pods -n billetterie"
}

# Script execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
