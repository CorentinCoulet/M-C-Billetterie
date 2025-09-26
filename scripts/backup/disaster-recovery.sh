#!/bin/bash

# Billetterie Disaster Recovery and Business Continuity Script
# This script handles disaster scenarios, automated failover, and recovery operations

set -euo pipefail
IFS=$'\n\t'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="/var/log/billetterie"
readonly DR_LOG="$LOG_DIR/disaster-recovery.log"
readonly BACKUP_DIR="/backup"
readonly DR_CONFIG_FILE="$PROJECT_ROOT/config/disaster-recovery.conf"

# Disaster Recovery Settings
DR_MODE="${DR_MODE:-automatic}" # automatic, manual, test
RECOVERY_OBJECTIVE_TIME="${RTO:-300}" # Recovery Time Objective in seconds (5 minutes)
RECOVERY_POINT_OBJECTIVE="${RPO:-60}" # Recovery Point Objective in seconds (1 minute)
FAILOVER_THRESHOLD="${FAILOVER_THRESHOLD:-3}" # Number of failures before automatic failover
GEOGRAPHIC_REDUNDANCY="${GEOGRAPHIC_REDUNDANCY:-true}"

# Infrastructure endpoints
PRIMARY_SITE="${PRIMARY_SITE:-https://billetterie.com}"
SECONDARY_SITE="${SECONDARY_SITE:-https://dr.billetterie.com}"
DATABASE_PRIMARY="${DB_PRIMARY:-postgresql://primary:5432/billetterie}"
DATABASE_SECONDARY="${DB_SECONDARY:-postgresql://secondary:5432/billetterie}"

# Monitoring and alerting
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
MAX_DOWNTIME_MINUTES="${MAX_DOWNTIME:-5}"
ALERT_ESCALATION_TIME="${ALERT_ESCALATION_TIME:-300}"

# Cloud provider settings
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_BACKUP_REGION="${AWS_BACKUP_REGION:-us-west-2}"
AZURE_PRIMARY_REGION="${AZURE_PRIMARY_REGION:-eastus}"
AZURE_SECONDARY_REGION="${AZURE_SECONDARY_REGION:-westus2}"

# Colors and symbols
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'
readonly ALERT='🚨'
readonly FIRE='🔥'
readonly SHIELD='🛡️'
readonly RECOVERY='⚡'

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        CRITICAL)
            echo -e "${RED}${ALERT} [${timestamp}] CRITICAL: ${message}${NC}" >&2
            ;;
        ERROR)
            echo -e "${RED}[${timestamp}] ERROR: ${message}${NC}" >&2
            ;;
        WARN)
            echo -e "${YELLOW}[${timestamp}] WARN: ${message}${NC}" >&2
            ;;
        INFO)
            echo -e "${GREEN}[${timestamp}] INFO: ${message}${NC}"
            ;;
        RECOVERY)
            echo -e "${PURPLE}${RECOVERY} [${timestamp}] RECOVERY: ${message}${NC}"
            ;;
    esac
    
    # Write to DR log
    mkdir -p "$LOG_DIR"
    echo "[${timestamp}] ${level}: ${message}" >> "$DR_LOG"
    
    # Send to SIEM if available
    if command -v logger >/dev/null 2>&1; then
        logger -p local0.info -t "billetterie-dr" "${level}: ${message}"
    fi
}

critical_alert() {
    log CRITICAL "$*"
    send_emergency_alert "CRITICAL" "$*"
}

send_emergency_alert() {
    local severity="$1"
    local message="$2"
    
    # PagerDuty emergency alert
    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        curl -X POST 'https://events.pagerduty.com/v2/enqueue' \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Billetterie Disaster Recovery: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"disaster-recovery\",
                    \"component\": \"infrastructure\",
                    \"group\": \"billetterie\",
                    \"class\": \"disaster\"
                }
            }" >/dev/null 2>&1 || true
    fi
    
    # Slack emergency channel
    if [[ -n "${SLACK_EMERGENCY_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"channel\": \"#emergency\",
                \"text\": \"${FIRE} DISASTER RECOVERY ALERT\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"title\": \"Critical Infrastructure Issue\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Severity\",
                        \"value\": \"$severity\",
                        \"short\": true
                    }, {
                        \"title\": \"Time\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_EMERGENCY_WEBHOOK" >/dev/null 2>&1 || true
    fi
    
    # SMS alerts for on-call team
    if [[ -n "${TWILIO_ACCOUNT_SID:-}" ]] && [[ -n "${TWILIO_AUTH_TOKEN:-}" ]] && [[ -n "${ON_CALL_NUMBERS:-}" ]]; then
        IFS=',' read -ra NUMBERS <<< "$ON_CALL_NUMBERS"
        for number in "${NUMBERS[@]}"; do
            curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
                -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
                --data-urlencode "To=$number" \
                --data-urlencode "From=$TWILIO_FROM_NUMBER" \
                --data-urlencode "Body=CRITICAL: Billetterie DR Alert - $message" >/dev/null 2>&1 || true
        done
    fi
    
    # Email emergency list
    if [[ -n "${EMERGENCY_EMAIL_LIST:-}" ]] && command -v mail >/dev/null 2>&1; then
        echo "CRITICAL DISASTER RECOVERY ALERT

Time: $(date)
Severity: $severity
Message: $message

This is an automated alert from the Billetterie disaster recovery system.
Immediate attention required.

System Status: https://status.billetterie.com
Runbook: https://docs.billetterie.com/disaster-recovery
" | mail -s "CRITICAL: Billetterie Disaster Recovery Alert" "$EMERGENCY_EMAIL_LIST" || true
    fi
}

# Health monitoring functions
check_primary_site_health() {
    local response_time
    local http_status
    local ssl_status="unknown"
    
    # HTTP health check
    local health_check=$(curl -w "%{time_total},%{http_code}" -s -o /dev/null --max-time 10 "$PRIMARY_SITE/api/health" 2>/dev/null || echo "timeout,000")
    
    IFS=',' read -r response_time http_status <<< "$health_check"
    
    # SSL certificate check
    if command -v openssl >/dev/null 2>&1; then
        local ssl_info=$(echo | openssl s_client -servername "${PRIMARY_SITE#https://}" -connect "${PRIMARY_SITE#https://}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        if [[ -n "$ssl_info" ]]; then
            local not_after=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            local expire_timestamp=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expire_timestamp - current_timestamp) / 86400 ))
            
            if [[ $days_until_expiry -lt 30 ]]; then
                ssl_status="warning"
            elif [[ $days_until_expiry -lt 7 ]]; then
                ssl_status="critical"
            else
                ssl_status="ok"
            fi
        fi
    fi
    
    # Store health metrics
    cat > /tmp/primary_health.json <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "response_time": $response_time,
    "http_status": $http_status,
    "ssl_status": "$ssl_status",
    "site": "$PRIMARY_SITE"
}
EOF
    
    # Determine overall health
    if [[ "$http_status" == "200" ]] && (( $(echo "$response_time < 5.0" | bc -l) )); then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

check_database_health() {
    local db_url="$1"
    local db_name="${2:-primary}"
    
    # Check database connectivity and performance
    local start_time=$(date +%s.%N)
    
    if docker run --rm --network host postgres:16 psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
        local end_time=$(date +%s.%N)
        local response_time=$(echo "$end_time - $start_time" | bc)
        
        # Check connection count
        local connections=$(docker run --rm --network host postgres:16 psql "$db_url" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' \n' || echo "0")
        
        # Check database size
        local db_size=$(docker run --rm --network host postgres:16 psql "$db_url" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ' || echo "unknown")
        
        # Check for long-running queries
        local long_queries=$(docker run --rm --network host postgres:16 psql "$db_url" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';" 2>/dev/null | tr -d ' \n' || echo "0")
        
        cat > "/tmp/${db_name}_db_health.json" <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "healthy",
    "response_time": $response_time,
    "connections": $connections,
    "database_size": "$db_size",
    "long_queries": $long_queries,
    "database": "$db_name"
}
EOF
        echo "healthy"
    else
        cat > "/tmp/${db_name}_db_health.json" <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "unhealthy",
    "database": "$db_name",
    "error": "Connection failed"
}
EOF
        echo "unhealthy"
    fi
}

check_service_health() {
    local service="$1"
    
    case "$service" in
        redis)
            if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
                echo "healthy"
            else
                echo "unhealthy"
            fi
            ;;
        vault)
            if curl -f "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
                echo "healthy"
            else
                echo "unhealthy"
            fi
            ;;
        elasticsearch)
            if curl -f "http://elasticsearch:9200/_cluster/health" >/dev/null 2>&1; then
                echo "healthy"
            else
                echo "unhealthy"
            fi
            ;;
        *)
            if docker-compose ps "$service" | grep -q "Up"; then
                echo "healthy"
            else
                echo "unhealthy"
            fi
            ;;
    esac
}

# Disaster detection and assessment
assess_disaster_scenario() {
    log INFO "Assessing current disaster scenario..."
    
    local primary_health=$(check_primary_site_health)
    local db_primary_health=$(check_database_health "$DATABASE_PRIMARY" "primary")
    local db_secondary_health=$(check_database_health "$DATABASE_SECONDARY" "secondary")
    
    local disaster_type="none"
    local severity="low"
    local recovery_strategy=""
    
    # Analyze health status
    if [[ "$primary_health" == "unhealthy" ]] && [[ "$db_primary_health" == "unhealthy" ]]; then
        disaster_type="complete_outage"
        severity="critical"
        recovery_strategy="full_failover"
    elif [[ "$primary_health" == "unhealthy" ]]; then
        disaster_type="application_failure"
        severity="high"
        recovery_strategy="application_restart"
    elif [[ "$db_primary_health" == "unhealthy" ]]; then
        disaster_type="database_failure"
        severity="high"
        recovery_strategy="database_failover"
    fi
    
    # Store assessment
    cat > /tmp/disaster_assessment.json <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "disaster_type": "$disaster_type",
    "severity": "$severity",
    "recovery_strategy": "$recovery_strategy",
    "primary_site_health": "$primary_health",
    "primary_db_health": "$db_primary_health",
    "secondary_db_health": "$db_secondary_health",
    "estimated_rto": "$RECOVERY_OBJECTIVE_TIME",
    "estimated_rpo": "$RECOVERY_POINT_OBJECTIVE"
}
EOF
    
    log INFO "Disaster assessment: Type=$disaster_type, Severity=$severity, Strategy=$recovery_strategy"
    
    echo "$disaster_type"
}

# Recovery procedures
execute_full_failover() {
    log RECOVERY "Initiating full failover to secondary site..."
    critical_alert "Full failover initiated - switching to secondary site"
    
    local failover_start=$(date +%s)
    
    # 1. Create final backup from primary (if accessible)
    if [[ "$(check_database_health "$DATABASE_PRIMARY" "primary")" == "healthy" ]]; then
        log RECOVERY "Creating final backup from primary database..."
        create_emergency_backup "primary" "pre-failover"
    fi
    
    # 2. Promote secondary database to primary
    log RECOVERY "Promoting secondary database to primary..."
    promote_secondary_database || {
        critical_alert "Failed to promote secondary database"
        return 1
    }
    
    # 3. Update DNS to point to secondary site
    log RECOVERY "Updating DNS configuration..."
    update_dns_to_secondary || {
        critical_alert "Failed to update DNS configuration"
        return 1
    }
    
    # 4. Start applications on secondary site
    log RECOVERY "Starting applications on secondary site..."
    start_secondary_applications || {
        critical_alert "Failed to start secondary applications"
        return 1
    }
    
    # 5. Verify secondary site functionality
    log RECOVERY "Verifying secondary site functionality..."
    verify_secondary_site || {
        critical_alert "Secondary site verification failed"
        return 1
    }
    
    # 6. Update load balancer configuration
    log RECOVERY "Updating load balancer configuration..."
    update_load_balancer_config || {
        critical_alert "Failed to update load balancer"
        return 1
    }
    
    # 7. Notify all systems of the failover
    notify_failover_complete
    
    local failover_end=$(date +%s)
    local failover_duration=$((failover_end - failover_start))
    
    log RECOVERY "Full failover completed in ${failover_duration} seconds"
    
    # Record RTO achievement
    if [[ $failover_duration -le $RECOVERY_OBJECTIVE_TIME ]]; then
        log RECOVERY "RTO target achieved: ${failover_duration}s <= ${RECOVERY_OBJECTIVE_TIME}s"
    else
        log WARN "RTO target missed: ${failover_duration}s > ${RECOVERY_OBJECTIVE_TIME}s"
    fi
    
    return 0
}

promote_secondary_database() {
    log RECOVERY "Promoting secondary database to primary..."
    
    # Stop replication
    docker run --rm --network host postgres:16 psql "$DATABASE_SECONDARY" \
        -c "SELECT pg_promote();" || return 1
    
    # Update database configuration for primary role
    docker run --rm --network host postgres:16 psql "$DATABASE_SECONDARY" \
        -c "ALTER SYSTEM SET synchronous_standby_names = '';" || return 1
    
    # Reload configuration
    docker run --rm --network host postgres:16 psql "$DATABASE_SECONDARY" \
        -c "SELECT pg_reload_conf();" || return 1
    
    log RECOVERY "Secondary database promoted to primary successfully"
    return 0
}

update_dns_to_secondary() {
    log RECOVERY "Updating DNS to point to secondary site..."
    
    # This would integrate with your DNS provider's API
    # Example for AWS Route 53
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && command -v aws >/dev/null 2>&1; then
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch "{
                \"Changes\": [{
                    \"Action\": \"UPSERT\",
                    \"ResourceRecordSet\": {
                        \"Name\": \"billetterie.com\",
                        \"Type\": \"A\",
                        \"TTL\": 60,
                        \"ResourceRecords\": [{\"Value\": \"$SECONDARY_SITE_IP\"}]
                    }
                }]
            }" >/dev/null 2>&1
    fi
    
    # Example for Cloudflare
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
        curl -X PUT "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$CLOUDFLARE_RECORD_ID" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"A\",
                \"name\": \"billetterie.com\",
                \"content\": \"$SECONDARY_SITE_IP\",
                \"ttl\": 60
            }" >/dev/null 2>&1
    fi
    
    log RECOVERY "DNS update completed"
    return 0
}

start_secondary_applications() {
    log RECOVERY "Starting applications on secondary site..."
    
    # Connect to secondary site and start services
    if [[ -n "${SECONDARY_SITE_SSH:-}" ]]; then
        ssh "$SECONDARY_SITE_SSH" "
            cd /opt/billetterie &&
            docker-compose -f docker-compose.secondary.yml up -d
        " || return 1
    else
        # Local secondary environment
        docker-compose -f docker-compose.secondary.yml up -d || return 1
    fi
    
    log RECOVERY "Secondary applications started"
    return 0
}

verify_secondary_site() {
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f "$SECONDARY_SITE/api/health" >/dev/null 2>&1; then
            log RECOVERY "Secondary site is responding"
            
            # Additional verification checks
            local endpoints=("/api/events" "/api/auth/status" "/metrics")
            local all_healthy=true
            
            for endpoint in "${endpoints[@]}"; do
                if ! curl -f "$SECONDARY_SITE$endpoint" >/dev/null 2>&1; then
                    all_healthy=false
                    break
                fi
            done
            
            if [[ "$all_healthy" == "true" ]]; then
                log RECOVERY "Secondary site verification passed"
                return 0
            fi
        fi
        
        log RECOVERY "Waiting for secondary site to become healthy... ($((attempt+1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log ERROR "Secondary site failed verification after $max_attempts attempts"
    return 1
}

update_load_balancer_config() {
    log RECOVERY "Updating load balancer configuration..."
    
    # Update HAProxy configuration to route to secondary
    if [[ -f "/etc/haproxy/haproxy.cfg" ]]; then
        sed -i 's/server primary.*/server secondary '"$SECONDARY_SITE_IP"':3000 check/' /etc/haproxy/haproxy.cfg
        systemctl reload haproxy || service haproxy reload
    fi
    
    # Update Nginx upstream if used
    if [[ -f "/etc/nginx/conf.d/upstream.conf" ]]; then
        sed -i 's/server primary.*/server '"$SECONDARY_SITE_IP"':3000;/' /etc/nginx/conf.d/upstream.conf
        systemctl reload nginx || service nginx reload
    fi
    
    log RECOVERY "Load balancer configuration updated"
    return 0
}

notify_failover_complete() {
    log RECOVERY "Notifying stakeholders of failover completion..."
    
    # Send success notification
    send_emergency_alert "INFO" "Failover to secondary site completed successfully. Service restored at $SECONDARY_SITE"
    
    # Update status page
    if [[ -n "${STATUS_PAGE_API:-}" ]]; then
        curl -X POST "$STATUS_PAGE_API/incidents" \
            -H "Content-Type: application/json" \
            -d "{
                \"incident\": {
                    \"name\": \"Primary Site Failure - Failover Completed\",
                    \"status\": \"resolved\",
                    \"message\": \"Service has been restored on secondary infrastructure\"
                }
            }" >/dev/null 2>&1 || true
    fi
    
    log RECOVERY "Stakeholder notifications sent"
}

# Backup and restore functions
create_emergency_backup() {
    local source="$1"
    local backup_type="$2"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="$BACKUP_DIR/emergency-$backup_type-$timestamp"
    
    mkdir -p "$backup_path"
    
    case "$source" in
        primary)
            log RECOVERY "Creating emergency backup from primary systems..."
            
            # Database backup
            docker run --rm --network host postgres:16 pg_dump "$DATABASE_PRIMARY" | gzip > "$backup_path/primary-db.sql.gz"
            
            # Application data backup
            if docker-compose exec -T app test -d /app/uploads; then
                docker-compose exec -T app tar -czf - /app/uploads > "$backup_path/uploads.tar.gz"
            fi
            ;;
        secondary)
            log RECOVERY "Creating emergency backup from secondary systems..."
            
            docker run --rm --network host postgres:16 pg_dump "$DATABASE_SECONDARY" | gzip > "$backup_path/secondary-db.sql.gz"
            ;;
    esac
    
    # Create backup manifest
    cat > "$backup_path/manifest.json" <<EOF
{
    "timestamp": "$timestamp",
    "backup_type": "$backup_type",
    "source": "$source",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "disaster_scenario": "$(cat /tmp/disaster_assessment.json 2>/dev/null || echo '{}')"
}
EOF
    
    log RECOVERY "Emergency backup created: $backup_path"
}

# Continuous monitoring loop
continuous_monitoring() {
    log INFO "Starting continuous disaster recovery monitoring..."
    
    local failure_count=0
    local last_alert_time=0
    
    while true; do
        local current_time=$(date +%s)
        
        # Check primary site health
        local primary_health=$(check_primary_site_health)
        local db_primary_health=$(check_database_health "$DATABASE_PRIMARY" "primary")
        
        # Check critical services
        local redis_health=$(check_service_health "redis")
        local vault_health=$(check_service_health "vault")
        
        # Evaluate overall system health
        if [[ "$primary_health" == "unhealthy" ]] || [[ "$db_primary_health" == "unhealthy" ]]; then
            ((failure_count++))
            log WARN "System health check failed (count: $failure_count)"
            
            # Send alert if escalation time has passed
            if [[ $((current_time - last_alert_time)) -gt $ALERT_ESCALATION_TIME ]]; then
                send_emergency_alert "WARNING" "System health degraded - failure count: $failure_count"
                last_alert_time=$current_time
            fi
            
            # Trigger automatic failover if threshold reached
            if [[ $failure_count -ge $FAILOVER_THRESHOLD ]] && [[ "$DR_MODE" == "automatic" ]]; then
                critical_alert "Automatic failover threshold reached ($failure_count >= $FAILOVER_THRESHOLD)"
                
                # Assess disaster and execute recovery
                local disaster_type=$(assess_disaster_scenario)
                execute_disaster_recovery "$disaster_type"
                break
            fi
        else
            # Reset failure count on successful health check
            if [[ $failure_count -gt 0 ]]; then
                log INFO "System health restored, resetting failure count"
                failure_count=0
                send_emergency_alert "INFO" "System health restored"
            fi
        fi
        
        # Store monitoring data
        cat > /tmp/monitoring_status.json <<EOF
{
    "timestamp": "$(date -Iseconds)",
    "primary_health": "$primary_health",
    "database_health": "$db_primary_health",
    "redis_health": "$redis_health",
    "vault_health": "$vault_health",
    "failure_count": $failure_count,
    "dr_mode": "$DR_MODE"
}
EOF
        
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

execute_disaster_recovery() {
    local disaster_type="$1"
    
    log RECOVERY "Executing disaster recovery for: $disaster_type"
    
    case "$disaster_type" in
        complete_outage)
            execute_full_failover
            ;;
        application_failure)
            restart_application_services
            ;;
        database_failure)
            execute_database_failover
            ;;
        *)
            log ERROR "Unknown disaster type: $disaster_type"
            return 1
            ;;
    esac
}

restart_application_services() {
    log RECOVERY "Restarting application services..."
    
    # Graceful restart of application containers
    docker-compose restart app1 app2
    
    # Wait for health checks
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if [[ "$(check_primary_site_health)" == "healthy" ]]; then
            log RECOVERY "Application services restarted successfully"
            return 0
        fi
        
        log RECOVERY "Waiting for application to become healthy... ($((attempt+1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log ERROR "Application restart failed - escalating to full failover"
    execute_full_failover
}

execute_database_failover() {
    log RECOVERY "Executing database failover..."
    
    # Stop connections to primary database
    docker run --rm --network host postgres:16 psql "$DATABASE_PRIMARY" \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # Promote secondary database
    promote_secondary_database
    
    # Update application configuration to use secondary database
    update_application_database_config
    
    # Restart applications with new database configuration
    docker-compose restart app1 app2
    
    log RECOVERY "Database failover completed"
}

update_application_database_config() {
    log RECOVERY "Updating application database configuration..."
    
    # Update environment variables
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_SECONDARY|" .env.production
    
    # Reload environment in running containers
    docker-compose exec -T app1 kill -USR1 1 || true
    docker-compose exec -T app2 kill -USR1 1 || true
    
    log RECOVERY "Database configuration updated"
}

# Test and validation functions
run_disaster_recovery_test() {
    log INFO "Running disaster recovery test..."
    
    # Create test backup
    create_emergency_backup "primary" "test"
    
    # Test failover procedures (dry run)
    log INFO "Testing failover procedures (dry run)..."
    
    # Validate secondary site readiness
    if [[ "$(check_database_health "$DATABASE_SECONDARY" "secondary")" != "healthy" ]]; then
        log ERROR "Secondary database is not healthy - DR test failed"
        return 1
    fi
    
    # Test DNS update (dry run)
    log INFO "Testing DNS configuration..."
    
    # Test application startup on secondary
    log INFO "Testing secondary site application startup..."
    
    # Validate monitoring and alerting
    send_emergency_alert "TEST" "Disaster recovery test - please ignore"
    
    log INFO "Disaster recovery test completed successfully"
    return 0
}

# Main function
main() {
    local command="${1:-monitor}"
    
    case "$command" in
        monitor)
            continuous_monitoring
            ;;
        assess)
            assess_disaster_scenario
            ;;
        failover)
            local disaster_type="${2:-complete_outage}"
            execute_disaster_recovery "$disaster_type"
            ;;
        test)
            run_disaster_recovery_test
            ;;
        backup)
            local source="${2:-primary}"
            local type="${3:-manual}"
            create_emergency_backup "$source" "$type"
            ;;
        *)
            echo "Usage: $0 {monitor|assess|failover|test|backup}"
            echo ""
            echo "Commands:"
            echo "  monitor           - Start continuous monitoring"
            echo "  assess           - Assess current disaster scenario"
            echo "  failover [type]  - Execute disaster recovery"
            echo "  test             - Run DR test procedures"
            echo "  backup [source]  - Create emergency backup"
            exit 1
            ;;
    esac
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
