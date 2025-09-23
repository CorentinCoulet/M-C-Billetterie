#!/bin/bash
#
# Production Database Deployment Script
# Deploys PostgreSQL with master/slave replication and PgBouncer connection pooling
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Production Database Deployment...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we can connect to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes cluster connection verified${NC}"

# Create namespace if it doesn't exist
if ! kubectl get namespace billetterie &> /dev/null; then
    echo -e "${YELLOW}📦 Creating billetterie namespace...${NC}"
    kubectl create namespace billetterie
else
    echo -e "${GREEN}✅ Namespace billetterie already exists${NC}"
fi

# Check if External Secrets Operator is installed
if ! kubectl get crd secretstores.external-secrets.io &> /dev/null; then
    echo -e "${YELLOW}⚠️  External Secrets Operator not found. Installing...${NC}"
    helm repo add external-secrets https://charts.external-secrets.io
    helm repo update
    helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
    
    # Wait for operator to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/external-secrets -n external-secrets-system
fi

# Check if cert-manager is installed
if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
    echo -e "${YELLOW}⚠️  cert-manager not found. Installing...${NC}"
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
fi

# Generate strong passwords if not provided
if [ -z "$DATABASE_PASSWORD" ]; then
    DATABASE_PASSWORD=$(openssl rand -base64 32)
    echo -e "${YELLOW}🔐 Generated DATABASE_PASSWORD${NC}"
fi

if [ -z "$POSTGRES_REPLICATION_PASSWORD" ]; then
    POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32)
    echo -e "${YELLOW}🔐 Generated POSTGRES_REPLICATION_PASSWORD${NC}"
fi

if [ -z "$BACKUP_USER_PASSWORD" ]; then
    BACKUP_USER_PASSWORD=$(openssl rand -base64 32)
    echo -e "${YELLOW}🔐 Generated BACKUP_USER_PASSWORD${NC}"
fi

if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
    BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo -e "${YELLOW}🔐 Generated BACKUP_ENCRYPTION_KEY${NC}"
fi

# Create secrets (temporary - should be managed by external secrets operator)
echo -e "${YELLOW}🔐 Creating temporary secrets...${NC}"
kubectl create secret generic billetterie-secrets -n billetterie \
    --from-literal=DATABASE_PASSWORD="$DATABASE_PASSWORD" \
    --from-literal=POSTGRES_REPLICATION_PASSWORD="$POSTGRES_REPLICATION_PASSWORD" \
    --from-literal=BACKUP_USER_PASSWORD="$BACKUP_USER_PASSWORD" \
    --from-literal=BACKUP_ENCRYPTION_KEY="$BACKUP_ENCRYPTION_KEY" \
    --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}" \
    --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}" \
    --dry-run=client -o yaml | kubectl apply -f -

# Deploy the production configuration
echo -e "${BLUE}📋 Deploying PostgreSQL Master/Slave with PgBouncer...${NC}"

# Apply the production configuration
kubectl apply -f ../k8s/production.yaml

echo -e "${YELLOW}⏳ Waiting for PostgreSQL Master to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres,role=master -n billetterie --timeout=300s

echo -e "${YELLOW}⏳ Waiting for PostgreSQL Slave to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres,role=slave -n billetterie --timeout=300s

echo -e "${YELLOW}⏳ Waiting for PgBouncer to be ready...${NC}"
kubectl wait --for=condition=available deployment/pgbouncer -n billetterie --timeout=300s

# Verify the setup
echo -e "${BLUE}🔍 Verifying database setup...${NC}"

# Test master connection
echo -e "${YELLOW}Testing PostgreSQL Master connection...${NC}"
MASTER_POD=$(kubectl get pods -l app=postgres,role=master -n billetterie -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n billetterie $MASTER_POD -- pg_isready -U billetterie; then
    echo -e "${GREEN}✅ PostgreSQL Master is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL Master connection failed${NC}"
    exit 1
fi

# Test slave connection
echo -e "${YELLOW}Testing PostgreSQL Slave connection...${NC}"
SLAVE_POD=$(kubectl get pods -l app=postgres,role=slave -n billetterie -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n billetterie $SLAVE_POD -- pg_isready -U billetterie; then
    echo -e "${GREEN}✅ PostgreSQL Slave is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL Slave connection failed${NC}"
    exit 1
fi

# Test PgBouncer connection
echo -e "${YELLOW}Testing PgBouncer connection...${NC}"
PGBOUNCER_POD=$(kubectl get pods -l app=pgbouncer -n billetterie -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n billetterie $PGBOUNCER_POD -- nc -z localhost 6432; then
    echo -e "${GREEN}✅ PgBouncer is ready${NC}"
else
    echo -e "${RED}❌ PgBouncer connection failed${NC}"
    exit 1
fi

# Display connection info
echo -e "${BLUE}📊 Database Connection Information:${NC}"
echo -e "  ${GREEN}Master:${NC} postgres-master.billetterie.svc.cluster.local:5432"
echo -e "  ${GREEN}Slave (Read-only):${NC} postgres-slave.billetterie.svc.cluster.local:5432"
echo -e "  ${GREEN}PgBouncer (Recommended):${NC} pgbouncer.billetterie.svc.cluster.local:6432"
echo -e "  ${GREEN}Main endpoint:${NC} postgres.billetterie.svc.cluster.local:5432 (routes to PgBouncer)"

# Display backup information
echo -e "${BLUE}💾 Backup Configuration:${NC}"
echo -e "  ${GREEN}Schedule:${NC} Daily at 2 AM"
echo -e "  ${GREEN}Encryption:${NC} AES-256-CBC"
echo -e "  ${GREEN}Retention:${NC} 7 days local, 30 days in S3"
echo -e "  ${GREEN}Location:${NC} /backup in postgres-backup-pvc"

# Save passwords securely
echo -e "${YELLOW}🔐 Saving passwords to secure file...${NC}"
cat > database_passwords.txt << EOF
# PostgreSQL Production Passwords
# Store these securely and delete this file after configuring your secrets manager

DATABASE_PASSWORD=$DATABASE_PASSWORD
POSTGRES_REPLICATION_PASSWORD=$POSTGRES_REPLICATION_PASSWORD
BACKUP_USER_PASSWORD=$BACKUP_USER_PASSWORD
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY

# Connection strings (update your application configuration):
DATABASE_URL=postgres://billetterie:$DATABASE_PASSWORD@postgres.billetterie.svc.cluster.local:5432/billetterie
MASTER_URL=postgres://billetterie:$DATABASE_PASSWORD@postgres-master.billetterie.svc.cluster.local:5432/billetterie
SLAVE_URL=postgres://billetterie:$DATABASE_PASSWORD@postgres-slave.billetterie.svc.cluster.local:5432/billetterie
PGBOUNCER_URL=postgres://billetterie:$DATABASE_PASSWORD@pgbouncer.billetterie.svc.cluster.local:6432/billetterie
EOF

chmod 600 database_passwords.txt

echo -e "${GREEN}✅ Production Database Deployment Complete!${NC}"
echo -e "${YELLOW}⚠️  Important Next Steps:${NC}"
echo -e "  1. Configure your External Secrets Operator with your secrets manager"
echo -e "  2. Update your application's DATABASE_URL to use PgBouncer"
echo -e "  3. Configure S3 credentials for automated backups (optional)"
echo -e "  4. Test the database connection from your application"
echo -e "  5. Delete database_passwords.txt after configuring secrets manager"
echo -e "  6. Run 'kubectl get pods -n billetterie' to monitor pod status"

echo -e "${BLUE}📋 Monitoring commands:${NC}"
echo -e "  kubectl get pods -n billetterie -w"
echo -e "  kubectl logs -f deployment/pgbouncer -n billetterie"
echo -e "  kubectl exec -it <postgres-master-pod> -n billetterie -- psql -U billetterie"

echo -e "${GREEN}🎉 Database infrastructure is ready for production!${NC}"
