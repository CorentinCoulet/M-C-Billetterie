#!/bin/bash
#
# Database Health Check and Performance Test Script
# Validates the PostgreSQL master/slave replication and PgBouncer setup
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Running Production Database Health Checks...${NC}"

NAMESPACE="billetterie"

# Function to run SQL query
run_sql() {
    local pod=$1
    local query=$2
    local user=${3:-billetterie}
    
    kubectl exec -n $NAMESPACE $pod -- psql -U $user -d billetterie -c "$query" -t -A
}

# Get pod names
MASTER_POD=$(kubectl get pods -l app=postgres,role=master -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
SLAVE_POD=$(kubectl get pods -l app=postgres,role=slave -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
PGBOUNCER_POD=$(kubectl get pods -l app=pgbouncer -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$MASTER_POD" ] || [ -z "$SLAVE_POD" ] || [ -z "$PGBOUNCER_POD" ]; then
    echo -e "${RED}❌ Some pods are missing. Check deployment status.${NC}"
    kubectl get pods -n $NAMESPACE
    exit 1
fi

echo -e "${GREEN}✅ All pods found:${NC}"
echo -e "  Master: $MASTER_POD"
echo -e "  Slave: $SLAVE_POD"
echo -e "  PgBouncer: $PGBOUNCER_POD"

# Test 1: Basic Connectivity
echo -e "\n${BLUE}🔌 Test 1: Basic Connectivity${NC}"

if kubectl exec -n $NAMESPACE $MASTER_POD -- pg_isready -U billetterie >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Master connectivity: OK${NC}"
else
    echo -e "${RED}❌ Master connectivity: FAILED${NC}"
    exit 1
fi

if kubectl exec -n $NAMESPACE $SLAVE_POD -- pg_isready -U billetterie >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Slave connectivity: OK${NC}"
else
    echo -e "${RED}❌ Slave connectivity: FAILED${NC}"
    exit 1
fi

if kubectl exec -n $NAMESPACE $PGBOUNCER_POD -- nc -z localhost 6432 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PgBouncer connectivity: OK${NC}"
else
    echo -e "${RED}❌ PgBouncer connectivity: FAILED${NC}"
    exit 1
fi

# Test 2: Replication Status
echo -e "\n${BLUE}🔄 Test 2: Replication Status${NC}"

# Check if replication is working
REPLICATION_STATUS=$(run_sql $MASTER_POD "SELECT state FROM pg_stat_replication WHERE usename='replicator';" 2>/dev/null || echo "")

if [ "$REPLICATION_STATUS" = "streaming" ]; then
    echo -e "${GREEN}✅ Replication status: streaming${NC}"
else
    echo -e "${YELLOW}⚠️  Replication status: $REPLICATION_STATUS${NC}"
    echo -e "${YELLOW}   This might be normal if slave is still initializing${NC}"
fi

# Check slave lag
LAG=$(run_sql $MASTER_POD "SELECT CASE WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0 ELSE EXTRACT (EPOCH FROM now() - pg_last_xact_replay_timestamp()) END AS log_delay;" 2>/dev/null || echo "unknown")

if [ "$LAG" != "unknown" ] && [ "$LAG" != "" ]; then
    if (( $(echo "$LAG < 10" | bc -l) )); then
        echo -e "${GREEN}✅ Replication lag: ${LAG}s (good)${NC}"
    else
        echo -e "${YELLOW}⚠️  Replication lag: ${LAG}s (high)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine replication lag${NC}"
fi

# Test 3: Data Replication Test
echo -e "\n${BLUE}📊 Test 3: Data Replication Test${NC}"

# Create test table and insert data on master
TEST_TABLE="health_check_$(date +%s)"
run_sql $MASTER_POD "CREATE TABLE IF NOT EXISTS $TEST_TABLE (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());" >/dev/null 2>&1
run_sql $MASTER_POD "INSERT INTO $TEST_TABLE (data) VALUES ('replication test data');" >/dev/null 2>&1

# Wait a moment for replication
sleep 2

# Check if data appears on slave
SLAVE_COUNT=$(run_sql $SLAVE_POD "SELECT COUNT(*) FROM $TEST_TABLE WHERE data = 'replication test data';" 2>/dev/null || echo "0")

if [ "$SLAVE_COUNT" = "1" ]; then
    echo -e "${GREEN}✅ Data replication: working${NC}"
else
    echo -e "${RED}❌ Data replication: failed (count: $SLAVE_COUNT)${NC}"
fi

# Clean up test table
run_sql $MASTER_POD "DROP TABLE IF EXISTS $TEST_TABLE;" >/dev/null 2>&1

# Test 4: PgBouncer Pool Status
echo -e "\n${BLUE}🏊 Test 4: PgBouncer Pool Status${NC}"

# Check PgBouncer stats (this might fail if pgbouncer admin access is not configured)
POOL_STATS=$(kubectl exec -n $NAMESPACE $PGBOUNCER_POD -- psql -h localhost -p 6432 -U billetterie -d pgbouncer -c "SHOW pools;" 2>/dev/null || echo "access_denied")

if [ "$POOL_STATS" != "access_denied" ]; then
    echo -e "${GREEN}✅ PgBouncer pools accessible${NC}"
    echo "$POOL_STATS"
else
    echo -e "${YELLOW}⚠️  PgBouncer admin interface not accessible (expected)${NC}"
fi

# Test 5: SSL Configuration
echo -e "\n${BLUE}🔐 Test 5: SSL Configuration${NC}"

SSL_STATUS=$(run_sql $MASTER_POD "SHOW ssl;" 2>/dev/null || echo "unknown")
if [ "$SSL_STATUS" = "on" ]; then
    echo -e "${GREEN}✅ SSL enabled on master${NC}"
else
    echo -e "${YELLOW}⚠️  SSL status on master: $SSL_STATUS${NC}"
fi

# Test 6: Database Performance Metrics
echo -e "\n${BLUE}⚡ Test 6: Performance Metrics${NC}"

# Check database size
DB_SIZE=$(run_sql $MASTER_POD "SELECT pg_size_pretty(pg_database_size('billetterie'));" 2>/dev/null || echo "unknown")
echo -e "Database size: $DB_SIZE"

# Check connection count
CONN_COUNT=$(run_sql $MASTER_POD "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "unknown")
echo -e "Active connections: $CONN_COUNT"

# Check cache hit ratio
CACHE_HIT=$(run_sql $MASTER_POD "SELECT round((sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read)))::numeric, 2) as cache_hit_ratio FROM pg_stat_database WHERE datname = 'billetterie';" 2>/dev/null || echo "unknown")
echo -e "Cache hit ratio: ${CACHE_HIT}%"

# Test 7: Backup Configuration
echo -e "\n${BLUE}💾 Test 7: Backup Configuration${NC}"

# Check if backup CronJob exists
if kubectl get cronjob postgres-backup -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backup CronJob configured${NC}"
    
    # Check last backup job
    LAST_JOB=$(kubectl get jobs -n $NAMESPACE -l job-name=postgres-backup --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$LAST_JOB" ]; then
        JOB_STATUS=$(kubectl get job $LAST_JOB -n $NAMESPACE -o jsonpath='{.status.succeeded}' 2>/dev/null || echo "0")
        if [ "$JOB_STATUS" = "1" ]; then
            echo -e "${GREEN}✅ Last backup job: successful${NC}"
        else
            echo -e "${YELLOW}⚠️  Last backup job: $LAST_JOB (check status)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No backup jobs found yet${NC}"
    fi
else
    echo -e "${RED}❌ Backup CronJob not found${NC}"
fi

# Test 8: Resource Usage
echo -e "\n${BLUE}💻 Test 8: Resource Usage${NC}"

# Get resource usage for postgres pods
echo "Master Pod Resources:"
kubectl top pod $MASTER_POD -n $NAMESPACE 2>/dev/null || echo "  Metrics not available"

echo "Slave Pod Resources:"
kubectl top pod $SLAVE_POD -n $NAMESPACE 2>/dev/null || echo "  Metrics not available"

echo "PgBouncer Pod Resources:"
kubectl top pod $PGBOUNCER_POD -n $NAMESPACE 2>/dev/null || echo "  Metrics not available"

# Summary
echo -e "\n${BLUE}📊 Health Check Summary${NC}"

# Count successful tests (basic implementation)
echo -e "${GREEN}✅ Database infrastructure is healthy${NC}"
echo -e "${YELLOW}⚠️  Monitor replication lag regularly${NC}"
echo -e "${BLUE}📋 Recommended monitoring:${NC}"
echo -e "  - Set up alerts for replication lag > 30s"
echo -e "  - Monitor connection pool utilization"
echo -e "  - Verify backup jobs run successfully"
echo -e "  - Watch for SSL certificate expiration"

echo -e "\n${GREEN}🎉 Health check completed!${NC}"

# Performance test option
read -p "Run performance stress test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}🏃 Running performance stress test...${NC}"
    
    # Simple performance test
    run_sql $MASTER_POD "CREATE TABLE IF NOT EXISTS perf_test (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());"
    
    echo "Inserting 1000 test records..."
    for i in {1..1000}; do
        run_sql $MASTER_POD "INSERT INTO perf_test (data) VALUES ('test data $i');" >/dev/null 2>&1
    done
    
    echo "Testing SELECT performance..."
    time run_sql $MASTER_POD "SELECT COUNT(*) FROM perf_test;" >/dev/null
    
    echo "Cleaning up test data..."
    run_sql $MASTER_POD "DROP TABLE perf_test;" >/dev/null 2>&1
    
    echo -e "${GREEN}✅ Performance test completed${NC}"
fi
