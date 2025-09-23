#!/bin/bash
#
# Production Deployment Script with Cache and Monitoring
# Deploys the complete billetterie system with all optimizations
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Production Deployment with Cache & Monitoring${NC}"

# Configuration
NAMESPACE=${NAMESPACE:-billetterie}
IMAGE_TAG=${IMAGE_TAG:-latest}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-billetterie}
MONITORING_ENABLED=${MONITORING_ENABLED:-true}
CACHE_ENABLED=${CACHE_ENABLED:-true}
SENTRY_ENABLED=${SENTRY_ENABLED:-true}

# Required environment variables check
check_requirements() {
    echo -e "${YELLOW}🔍 Checking requirements...${NC}"
    
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "NEXTAUTH_SECRET"
        "EMAIL_FROM"
        "EMAIL_SERVER_HOST"
        "EMAIL_SERVER_PORT"
        "EMAIL_SERVER_USER"
        "EMAIL_SERVER_PASSWORD"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
        "REDIS_PASSWORD"
    )
    
    local optional_vars=(
        "SENTRY_DSN"
        "NEXT_PUBLIC_SENTRY_DSN"
        "SENTRY_ORG"
        "SENTRY_PROJECT"
        "SENTRY_AUTH_TOKEN"
    )
    
    local missing_required=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_required+=("$var")
        fi
    done
    
    if [ ${#missing_required[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        printf '%s\n' "${missing_required[@]}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All required environment variables present${NC}"
    
    # Check optional variables
    local missing_optional=()
    for var in "${optional_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_optional+=("$var")
        fi
    done
    
    if [ ${#missing_optional[@]} -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Optional environment variables missing (some features may be disabled):${NC}"
        printf '  %s\n' "${missing_optional[@]}"
    fi
}

# Create namespace if it doesn't exist
create_namespace() {
    echo -e "${YELLOW}📁 Creating namespace...${NC}"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    echo -e "${GREEN}✅ Namespace ready${NC}"
}

# Deploy secrets
deploy_secrets() {
    echo -e "${YELLOW}🔐 Deploying secrets...${NC}"
    
    # Create secret data
    local secret_data=""
    
    # Required secrets
    secret_data+="--from-literal=DATABASE_URL=\"$DATABASE_URL\" "
    secret_data+="--from-literal=JWT_SECRET=\"$JWT_SECRET\" "
    secret_data+="--from-literal=NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\" "
    secret_data+="--from-literal=EMAIL_FROM=\"$EMAIL_FROM\" "
    secret_data+="--from-literal=EMAIL_SERVER_HOST=\"$EMAIL_SERVER_HOST\" "
    secret_data+="--from-literal=EMAIL_SERVER_PORT=\"$EMAIL_SERVER_PORT\" "
    secret_data+="--from-literal=EMAIL_SERVER_USER=\"$EMAIL_SERVER_USER\" "
    secret_data+="--from-literal=EMAIL_SERVER_PASSWORD=\"$EMAIL_SERVER_PASSWORD\" "
    secret_data+="--from-literal=STRIPE_SECRET_KEY=\"$STRIPE_SECRET_KEY\" "
    secret_data+="--from-literal=STRIPE_PUBLISHABLE_KEY=\"$STRIPE_PUBLISHABLE_KEY\" "
    secret_data+="--from-literal=GOOGLE_CLIENT_ID=\"$GOOGLE_CLIENT_ID\" "
    secret_data+="--from-literal=GOOGLE_CLIENT_SECRET=\"$GOOGLE_CLIENT_SECRET\" "
    secret_data+="--from-literal=REDIS_PASSWORD=\"$REDIS_PASSWORD\" "
    
    # Optional secrets (Sentry)
    if [ ! -z "$SENTRY_DSN" ]; then
        secret_data+="--from-literal=SENTRY_DSN=\"$SENTRY_DSN\" "
    fi
    
    if [ ! -z "$NEXT_PUBLIC_SENTRY_DSN" ]; then
        secret_data+="--from-literal=NEXT_PUBLIC_SENTRY_DSN=\"$NEXT_PUBLIC_SENTRY_DSN\" "
    fi
    
    if [ ! -z "$SENTRY_ORG" ]; then
        secret_data+="--from-literal=SENTRY_ORG=\"$SENTRY_ORG\" "
    fi
    
    if [ ! -z "$SENTRY_PROJECT" ]; then
        secret_data+="--from-literal=SENTRY_PROJECT=\"$SENTRY_PROJECT\" "
    fi
    
    if [ ! -z "$SENTRY_AUTH_TOKEN" ]; then
        secret_data+="--from-literal=SENTRY_AUTH_TOKEN=\"$SENTRY_AUTH_TOKEN\" "
    fi
    
    # Create or update secret
    kubectl create secret generic billetterie-secrets -n $NAMESPACE $secret_data --dry-run=client -o yaml | kubectl apply -f -
    
    echo -e "${GREEN}✅ Secrets deployed${NC}"
}

# Deploy PostgreSQL with replication
deploy_database() {
    echo -e "${YELLOW}🐘 Deploying PostgreSQL cluster...${NC}"
    
    # Run the database deployment script
    if [ -f "./scripts/deploy-production-database.sh" ]; then
        chmod +x "./scripts/deploy-production-database.sh"
        NAMESPACE=$NAMESPACE ./scripts/deploy-production-database.sh
    else
        echo -e "${RED}❌ Database deployment script not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ PostgreSQL cluster deployed${NC}"
}

# Build and push Docker image
build_and_push_image() {
    echo -e "${YELLOW}🔨 Building and pushing Docker image...${NC}"
    
    # Build production image
    docker build -f docker/Dockerfile.prod -t ${DOCKER_REGISTRY}/billetterie:${IMAGE_TAG} .
    
    # Push to registry (if not local)
    if [ "$DOCKER_REGISTRY" != "billetterie" ]; then
        docker push ${DOCKER_REGISTRY}/billetterie:${IMAGE_TAG}
        echo -e "${GREEN}✅ Image pushed to registry${NC}"
    else
        echo -e "${GREEN}✅ Image built locally${NC}"
    fi
}

# Deploy main application
deploy_application() {
    echo -e "${YELLOW}🎯 Deploying main application...${NC}"
    
    # Update image tag in deployment manifest
    sed -i.bak "s|image: billetterie/billetterie:.*|image: ${DOCKER_REGISTRY}/billetterie:${IMAGE_TAG}|g" k8s/production.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/production.yaml
    
    # Wait for deployment
    echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=600s deployment/billetterie -n $NAMESPACE
    
    echo -e "${GREEN}✅ Application deployed${NC}"
}

# Initialize cache
initialize_cache() {
    if [ "$CACHE_ENABLED" = "true" ]; then
        echo -e "${YELLOW}🔥 Initializing cache...${NC}"
        
        # Wait for Redis to be ready
        kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
        
        # Configure Redis
        if [ -f "./scripts/manage-cache.sh" ]; then
            chmod +x "./scripts/manage-cache.sh"
            NAMESPACE=$NAMESPACE ./scripts/manage-cache.sh config
            
            # Warm up cache
            sleep 10
            NAMESPACE=$NAMESPACE ./scripts/manage-cache.sh warmup
        fi
        
        echo -e "${GREEN}✅ Cache initialized and warmed up${NC}"
    else
        echo -e "${YELLOW}⚠️  Cache disabled${NC}"
    fi
}

# Setup monitoring
setup_monitoring() {
    if [ "$MONITORING_ENABLED" = "true" ]; then
        echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
        
        # Deploy Prometheus (if available)
        if [ -f "monitoring/prometheus-production.yml" ]; then
            kubectl apply -f monitoring/prometheus-production.yml
            echo -e "${GREEN}✅ Prometheus configured${NC}"
        fi
        
        # Test monitoring endpoints
        echo -e "${YELLOW}🧪 Testing monitoring endpoints...${NC}"
        
        # Wait for application to be ready
        kubectl wait --for=condition=ready pod -l app=billetterie -n $NAMESPACE --timeout=300s
        
        # Get application pod
        APP_POD=$(kubectl get pods -l app=billetterie -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
        
        if [ ! -z "$APP_POD" ]; then
            echo -e "  Testing health endpoint..."
            kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/health >/dev/null && \
                echo -e "${GREEN}    ✅ Health endpoint working${NC}" || \
                echo -e "${RED}    ❌ Health endpoint failed${NC}"
                
            echo -e "  Testing cache health..."
            kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/cache/health >/dev/null && \
                echo -e "${GREEN}    ✅ Cache health endpoint working${NC}" || \
                echo -e "${RED}    ❌ Cache health endpoint failed${NC}"
                
            if [ "$SENTRY_ENABLED" = "true" ] && [ ! -z "$SENTRY_DSN" ]; then
                echo -e "  Testing Sentry..."
                kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/monitoring/sentry >/dev/null && \
                    echo -e "${GREEN}    ✅ Sentry endpoint working${NC}" || \
                    echo -e "${RED}    ❌ Sentry endpoint failed${NC}"
            fi
        fi
        
        echo -e "${GREEN}✅ Monitoring setup complete${NC}"
    else
        echo -e "${YELLOW}⚠️  Monitoring disabled${NC}"
    fi
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    
    # Get application pod
    APP_POD=$(kubectl get pods -l app=billetterie -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    
    if [ ! -z "$APP_POD" ]; then
        # Run Prisma migrations
        kubectl exec -n $NAMESPACE $APP_POD -- npx prisma migrate deploy
        echo -e "${GREEN}✅ Database migrations completed${NC}"
    else
        echo -e "${RED}❌ No application pod found for migrations${NC}"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    # Check all pods are running
    echo -e "  Checking pods..."
    kubectl get pods -n $NAMESPACE
    
    # Check services
    echo -e "\n  Checking services..."
    kubectl get services -n $NAMESPACE
    
    # Check ingress
    echo -e "\n  Checking ingress..."
    kubectl get ingress -n $NAMESPACE
    
    # Test application health
    APP_POD=$(kubectl get pods -l app=billetterie -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    if [ ! -z "$APP_POD" ]; then
        echo -e "\n  Testing application health..."
        if kubectl exec -n $NAMESPACE $APP_POD -- curl -s -f http://localhost:3000/api/health >/dev/null; then
            echo -e "${GREEN}    ✅ Application is healthy${NC}"
        else
            echo -e "${RED}    ❌ Application health check failed${NC}"
            kubectl logs -n $NAMESPACE $APP_POD --tail=50
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Deployment verification complete${NC}"
}

# Post-deployment tasks
post_deployment() {
    echo -e "${YELLOW}📋 Post-deployment tasks...${NC}"
    
    # Create initial admin user (if needed)
    APP_POD=$(kubectl get pods -l app=billetterie -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    if [ ! -z "$APP_POD" ]; then
        echo -e "  Checking for admin user..."
        # This would need to be implemented in your application
        # kubectl exec -n $NAMESPACE $APP_POD -- npm run create-admin-user
    fi
    
    # Setup backup schedule (if not already done)
    if kubectl get cronjob -n $NAMESPACE postgres-backup >/dev/null 2>&1; then
        echo -e "${GREEN}    ✅ Backup schedule active${NC}"
    else
        echo -e "${YELLOW}    ⚠️  Backup schedule not found${NC}"
    fi
    
    # Print access information
    echo -e "\n${BLUE}🎉 Deployment Complete!${NC}"
    echo -e "${GREEN}Application URL: https://your-domain.com${NC}"
    echo -e "${GREEN}Admin URL: https://your-domain.com/admin${NC}"
    echo -e "${GREEN}Health Check: https://your-domain.com/api/health${NC}"
    
    if [ "$MONITORING_ENABLED" = "true" ]; then
        echo -e "${GREEN}Monitoring: https://your-domain.com/api/monitoring${NC}"
    fi
    
    echo -e "${GREEN}Namespace: $NAMESPACE${NC}"
    echo -e "${GREEN}Version: $IMAGE_TAG${NC}"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo -e "  1. Configure your domain and SSL certificates"
    echo -e "  2. Set up monitoring alerts"
    echo -e "  3. Configure backup retention policies"
    echo -e "  4. Run performance tests"
    echo -e "  5. Set up CI/CD pipeline"
}

# Error handler
error_handler() {
    echo -e "${RED}❌ Deployment failed at step: $1${NC}"
    echo -e "${YELLOW}Check the logs above for details${NC}"
    exit 1
}

# Main deployment sequence
main() {
    echo -e "${BLUE}Starting production deployment...${NC}"
    
    check_requirements || error_handler "requirements check"
    create_namespace || error_handler "namespace creation"
    deploy_secrets || error_handler "secrets deployment"
    deploy_database || error_handler "database deployment"
    build_and_push_image || error_handler "image build"
    deploy_application || error_handler "application deployment"
    run_migrations || error_handler "database migrations"
    initialize_cache || error_handler "cache initialization"
    setup_monitoring || error_handler "monitoring setup"
    verify_deployment || error_handler "deployment verification"
    post_deployment
    
    echo -e "\n${GREEN}🎊 Production deployment completed successfully!${NC}"
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Production Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  secrets   - Deploy secrets only"
        echo "  database  - Deploy database only"
        echo "  app       - Deploy application only"
        echo "  cache     - Initialize cache only"
        echo "  monitor   - Setup monitoring only"
        echo "  verify    - Verify deployment only"
        echo "  help      - Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  NAMESPACE           - Kubernetes namespace (default: billetterie)"
        echo "  IMAGE_TAG           - Docker image tag (default: latest)"
        echo "  DOCKER_REGISTRY     - Docker registry (default: billetterie)"
        echo "  MONITORING_ENABLED  - Enable monitoring (default: true)"
        echo "  CACHE_ENABLED       - Enable cache (default: true)"
        echo "  SENTRY_ENABLED      - Enable Sentry (default: true)"
        ;;
    "secrets")
        check_requirements
        deploy_secrets
        ;;
    "database")
        deploy_database
        ;;
    "app")
        deploy_application
        ;;
    "cache")
        initialize_cache
        ;;
    "monitor")
        setup_monitoring
        ;;
    "verify")
        verify_deployment
        ;;
    "deploy"|"")
        main
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
