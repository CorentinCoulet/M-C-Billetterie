#!/bin/bash

# Billetterie Zero-Downtime Deployment with Advanced Security
# This script provides enterprise-grade deployment capabilities with
# comprehensive security checks, monitoring, and rollback mechanisms.

set -euo pipefail
IFS=$'\n\t'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="/var/log/billetterie"
readonly DEPLOYMENT_LOG="$LOG_DIR/deployment.log"
readonly SECURITY_LOG="$LOG_DIR/security.log"
readonly BACKUP_DIR="/backup/deployments"
readonly TEMP_DIR="/tmp/billetterie-deploy"

# Deployment settings
VERSION="${VERSION:-$(date +%Y%m%d-%H%M%S)}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-zero-downtime}" # zero-downtime, maintenance, emergency
SECURITY_LEVEL="${SECURITY_LEVEL:-strict}" # strict, standard, minimal
DRY_RUN="${DRY_RUN:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

# Security settings
VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
CONSUL_ADDR="${CONSUL_ADDR:-http://consul:8500}"
WAF_ENABLED="${WAF_ENABLED:-true}"
INTRUSION_DETECTION="${INTRUSION_DETECTION:-true}"

# Monitoring and alerting
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://grafana:3000}"
ALERT_MANAGER_URL="${ALERT_MANAGER_URL:-http://alertmanager:9093}"

# Colors and formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Unicode symbols for better UX
readonly CHECK_MARK='\u2713'
readonly CROSS_MARK='\u2717'
readonly WARNING='\u26A0'
readonly ROCKET='\U1F680'
readonly SHIELD='\U1F6E1'
readonly GEAR='\u2699'

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local color=""
    local symbol=""
    
    case "$level" in
        ERROR)
            color="$RED"
            symbol="$CROSS_MARK"
            ;;
        WARN)
            color="$YELLOW"
            symbol="$WARNING"
            ;;
        INFO)
            color="$GREEN"
            symbol="$CHECK_MARK"
            ;;
        DEBUG)
            color="$BLUE"
            symbol="$GEAR"
            ;;
        SECURITY)
            color="$PURPLE"
            symbol="$SHIELD"
            ;;
    esac
    
    echo -e "${color}${symbol} [${timestamp}] ${level}: ${message}${NC}"
    
    # Write to log file
    mkdir -p "$LOG_DIR"
    echo "[${timestamp}] ${level}: ${message}" >> "$DEPLOYMENT_LOG"
    
    # Write security events to security log
    if [[ "$level" == "SECURITY" ]]; then
        echo "[${timestamp}] SECURITY: ${message}" >> "$SECURITY_LOG"
    fi
}

security_log() {
    log SECURITY "$*"
}

error_exit() {
    log ERROR "$1"
    
    # Send critical alert
    send_alert "CRITICAL" "Deployment Failed" "$1"
    
    # Emergency rollback if deployment was in progress
    if [[ -f "$TEMP_DIR/deployment_started" ]]; then
        log ERROR "Initiating emergency rollback..."
        emergency_rollback || true
    fi
    
    cleanup_on_failure
    exit 1
}

send_alert() {
    local severity="$1"
    local title="$2"
    local message="$3"
    
    # AlertManager alert
    if [[ -n "${ALERT_MANAGER_URL:-}" ]]; then
        curl -X POST "$ALERT_MANAGER_URL/api/v1/alerts" \
            -H "Content-Type: application/json" \
            -d "[{
                \"labels\": {
                    \"alertname\": \"DeploymentAlert\",
                    \"service\": \"billetterie\",
                    \"severity\": \"$severity\",
                    \"environment\": \"$ENVIRONMENT\"
                },
                \"annotations\": {
                    \"summary\": \"$title\",
                    \"description\": \"$message\"
                }
            }]" >/dev/null 2>&1 || true
    fi
    
    # Slack webhook
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local emoji=""
        case "$severity" in
            CRITICAL) emoji=":rotating_light:" ;;
            WARNING) emoji=":warning:" ;;
            INFO) emoji=":information_source:" ;;
            *) emoji=":rocket:" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$emoji Billetterie Deployment Alert\",
                \"attachments\": [{
                    \"color\": \"$([ "$severity" = "CRITICAL" ] && echo "danger" || echo "warning")\",
                    \"title\": \"$title\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    }, {
                        \"title\": \"Version\",
                        \"value\": \"$VERSION\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Enhanced security validation
validate_security_context() {
    log INFO "Validating security context..."
    
    # Check if running with appropriate privileges
    if [[ $EUID -eq 0 ]]; then
        error_exit "Deployment must not run as root"
    fi
    
    # Validate environment variables
    local required_secrets=("DATABASE_URL" "REDIS_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY")
    for secret in "${required_secrets[@]}"; do
        if [[ -z "${!secret:-}" ]]; then
            error_exit "Required secret not set: $secret"
        fi
        
        # Check secret strength
        if [[ ${#!secret} -lt 32 ]]; then
            error_exit "Secret too weak (min 32 chars): $secret"
        fi
    done
    
    # Validate TLS certificates
    security_log "Validating TLS certificates..."
    for cert_file in /certs/*.crt; do
        if [[ -f "$cert_file" ]]; then
            if ! openssl x509 -in "$cert_file" -checkend 2592000 -noout; then
                error_exit "Certificate expires within 30 days: $cert_file"
            fi
        fi
    done
    
    # Check for security updates
    if command -v docker >/dev/null 2>&1; then
        security_log "Checking base image security..."
        if command -v trivy >/dev/null 2>&1; then
            trivy image --exit-code 1 --severity HIGH,CRITICAL node:18-alpine >/dev/null 2>&1 || {
                if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                    error_exit "Base image has critical vulnerabilities"
                else
                    log WARN "Base image has vulnerabilities, but security level permits deployment"
                fi
            }
        fi
    fi
    
    security_log "Security context validation completed"
}

# Advanced pre-flight checks
run_preflight_checks() {
    log INFO "Running comprehensive pre-flight checks..."
    
    # System resources
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    local available_disk=$(df / | awk 'NR==2{print $4}')
    
    if [[ $available_memory -lt 2048 ]]; then
        error_exit "Insufficient memory: ${available_memory}MB (required: 2048MB)"
    fi
    
    if [[ $available_disk -lt 10485760 ]]; then # 10GB in KB
        error_exit "Insufficient disk space: $((available_disk/1024/1024))GB (required: 10GB)"
    fi
    
    # Network connectivity
    local required_endpoints=(
        "registry-1.docker.io:443"
        "$VAULT_ADDR"
        "$PROMETHEUS_URL"
    )
    
    for endpoint in "${required_endpoints[@]}"; do
        if ! timeout 5 bash -c "</dev/tcp/${endpoint%:*}/${endpoint#*:}"; then
            error_exit "Cannot reach required endpoint: $endpoint"
        fi
    done
    
    # Database connectivity and migration check
    log INFO "Checking database connectivity and migrations..."
    if ! docker-compose exec -T db pg_isready >/dev/null 2>&1; then
        error_exit "Database is not ready"
    fi
    
    # Check for pending migrations
    local pending_migrations=$(docker-compose run --rm app npx prisma migrate status --schema=prisma/schema.prisma | grep -c "not yet applied" || echo "0")
    if [[ $pending_migrations -gt 0 ]] && [[ "$FORCE_DEPLOY" != "true" ]]; then
        error_exit "Pending database migrations detected. Use FORCE_DEPLOY=true to proceed"
    fi
    
    # Service dependency check
    local services=("db" "redis" "vault")
    for service in "${services[@]}"; do
        if ! docker-compose ps "$service" | grep -q "Up"; then
            error_exit "Required service not running: $service"
        fi
    done
    
    log INFO "Pre-flight checks completed successfully"
}

# Comprehensive security scanning
run_security_scan() {
    if [[ "$SECURITY_LEVEL" == "minimal" ]]; then
        log INFO "Minimal security scan (skipped)"
        return 0
    fi
    
    security_log "Starting comprehensive security scan..."
    
    # Container security scan with Trivy
    if command -v trivy >/dev/null 2>&1; then
        security_log "Running container vulnerability scan..."
        
        # Scan filesystem
        trivy fs --security-checks vuln,config,secret --exit-code 1 --severity HIGH,CRITICAL . || {
            if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                error_exit "Critical security vulnerabilities found in filesystem"
            else
                log WARN "Vulnerabilities found but security level permits deployment"
            fi
        }
        
        # Scan Docker images
        local images=("billetterie:latest" "billetterie-waf:latest")
        for image in "${images[@]}"; do
            if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "$image"; then
                trivy image --exit-code 1 --severity HIGH,CRITICAL "$image" || {
                    if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                        error_exit "Critical vulnerabilities in image: $image"
                    else
                        log WARN "Vulnerabilities in $image but deployment permitted"
                    fi
                }
            fi
        done
    fi
    
    # Secret detection with gitleaks
    if command -v gitleaks >/dev/null 2>&1; then
        security_log "Running secret detection scan..."
        gitleaks detect --source="$PROJECT_ROOT" --report-format json --report-path /tmp/gitleaks-report.json || {
            if [[ -s /tmp/gitleaks-report.json ]]; then
                security_log "Secrets detected in source code!"
                if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                    error_exit "Secrets detected in source code"
                else
                    log WARN "Secrets detected but security level permits deployment"
                fi
            fi
        }
    fi
    
    # SAST with Semgrep
    if command -v semgrep >/dev/null 2>&1; then
        security_log "Running static analysis security testing..."
        semgrep --config=auto --json --output=/tmp/semgrep-results.json "$PROJECT_ROOT" || {
            local high_severity_count=$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' /tmp/semgrep-results.json 2>/dev/null || echo "0")
            if [[ $high_severity_count -gt 0 ]]; then
                security_log "High severity security issues found: $high_severity_count"
                if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                    error_exit "High severity security issues found"
                else
                    log WARN "Security issues found but deployment permitted"
                fi
            fi
        }
    fi
    
    # Infrastructure security with Checkov
    if command -v checkov >/dev/null 2>&1; then
        security_log "Running infrastructure security scan..."
        checkov -d "$PROJECT_ROOT" --framework docker,kubernetes,terraform --output json --output-file /tmp/checkov-results.json || {
            local failed_checks=$(jq '.results.failed_checks | length' /tmp/checkov-results.json 2>/dev/null || echo "0")
            if [[ $failed_checks -gt 0 ]]; then
                security_log "Infrastructure security checks failed: $failed_checks"
                if [[ "$SECURITY_LEVEL" == "strict" ]]; then
                    error_exit "Critical infrastructure security issues found"
                else
                    log WARN "Infrastructure security issues found but deployment permitted"
                fi
            fi
        }
    fi
    
    # Network security validation
    security_log "Validating network security configuration..."
    
    # Check firewall rules (if ufw is available)
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            security_log "Firewall is active and configured"
        else
            log WARN "Firewall is not active"
        fi
    fi
    
    # Validate SSL/TLS configuration
    if [[ -f "$PROJECT_ROOT/docker/nginx.conf" ]]; then
        if grep -q "ssl_protocols TLSv1.2 TLSv1.3" "$PROJECT_ROOT/docker/nginx.conf"; then
            security_log "TLS configuration validated"
        else
            log WARN "TLS configuration may be weak"
        fi
    fi
    
    security_log "Security scan completed"
}

# Zero-downtime deployment implementation
deploy_zero_downtime() {
    log INFO "${ROCKET} Starting zero-downtime deployment..."
    
    # Mark deployment as started
    mkdir -p "$TEMP_DIR"
    touch "$TEMP_DIR/deployment_started"
    echo "$VERSION" > "$TEMP_DIR/current_deployment_version"
    
    # Create deployment backup
    create_deployment_backup
    
    # Build new images with version tags
    log INFO "Building application images..."
    
    # Build with security hardening
    docker build \
        --target production \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VERSION="$VERSION" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg NODE_ENV=production \
        --tag "billetterie:$VERSION" \
        --tag "billetterie:latest" \
        --file docker/Dockerfile.prod \
        --no-cache \
        . || error_exit "Failed to build application image"
    
    # Build WAF image
    docker build \
        --build-arg VERSION="$VERSION" \
        --tag "billetterie-waf:$VERSION" \
        --tag "billetterie-waf:latest" \
        --file docker/waf/Dockerfile \
        --no-cache \
        docker/waf/ || error_exit "Failed to build WAF image"
    
    # Run application tests in isolated environment
    run_deployment_tests
    
    # Deploy with rolling update strategy
    deploy_rolling_update
    
    # Post-deployment verification
    verify_deployment
    
    # Cleanup old images and containers
    cleanup_old_deployments
    
    # Mark deployment as completed
    rm -f "$TEMP_DIR/deployment_started"
    
    log INFO "${CHECK_MARK} Zero-downtime deployment completed successfully"
    send_alert "INFO" "Deployment Successful" "Version $VERSION deployed successfully"
}

deploy_rolling_update() {
    log INFO "Executing rolling update..."
    
    # Get list of app containers
    local app_containers=($(docker-compose ps -q app1 app2))
    local updated_containers=0
    
    for container in "${app_containers[@]}"; do
        local container_name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/^.//')
        
        log INFO "Updating container: $container_name"
        
        # Graceful shutdown
        docker-compose stop "$container_name"
        
        # Remove old container
        docker-compose rm -f "$container_name"
        
        # Start new container
        docker-compose up -d "$container_name"
        
        # Wait for health check
        wait_for_healthy_container "$container_name"
        
        # Verify the container is serving traffic
        verify_container_traffic "$container_name"
        
        ((updated_containers++))
        log INFO "Container $container_name updated successfully ($updated_containers/${#app_containers[@]})"
        
        # Brief pause between updates
        sleep 5
    done
    
    log INFO "Rolling update completed for all containers"
}

wait_for_healthy_container() {
    local container_name="$1"
    local max_attempts=60
    local attempt=0
    
    log INFO "Waiting for $container_name to become healthy..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        # Check container health
        local health_status=$(docker-compose exec -T "$container_name" curl -f http://localhost:3000/api/health 2>/dev/null && echo "healthy" || echo "unhealthy")
        
        if [[ "$health_status" == "healthy" ]]; then
            log INFO "Container $container_name is healthy"
            return 0
        fi
        
        log DEBUG "Health check attempt $((attempt+1))/$max_attempts for $container_name"
        sleep 5
        ((attempt++))
    done
    
    error_exit "Container $container_name failed to become healthy after $max_attempts attempts"
}

verify_container_traffic() {
    local container_name="$1"
    
    # Test basic endpoints
    local endpoints=("/api/health" "/api/events" "/metrics")
    
    for endpoint in "${endpoints[@]}"; do
        local response_code=$(docker-compose exec -T "$container_name" curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint")
        
        if [[ "$response_code" != "200" ]]; then
            error_exit "Container $container_name failing on endpoint $endpoint (HTTP $response_code)"
        fi
    done
    
    log INFO "Container $container_name traffic verification passed"
}

run_deployment_tests() {
    log INFO "Running deployment-specific tests..."
    
    # Create temporary test environment
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for test environment to be ready
    sleep 30
    
    # Run comprehensive test suite
    log INFO "Executing unit tests..."
    docker-compose -f docker-compose.test.yml exec -T app npm test -- --coverage --ci || {
        docker-compose -f docker-compose.test.yml down
        error_exit "Unit tests failed"
    }
    
    log INFO "Executing integration tests..."
    docker-compose -f docker-compose.test.yml exec -T app yarn test:integration || {
        docker-compose -f docker-compose.test.yml down
        error_exit "Integration tests failed"
    }
    
    log INFO "Executing security tests..."
    docker-compose -f docker-compose.test.yml exec -T app yarn test:security || {
        docker-compose -f docker-compose.test.yml down
        error_exit "Security tests failed"
    }
    
    log INFO "Executing end-to-end tests..."
    docker-compose -f docker-compose.test.yml exec -T app yarn test:e2e || {
        docker-compose -f docker-compose.test.yml down
        error_exit "End-to-end tests failed"
    }
    
    # Performance baseline test
    log INFO "Running performance baseline tests..."
    if command -v wrk >/dev/null 2>&1; then
        local perf_result=$(docker-compose -f docker-compose.test.yml exec -T app wrk -t4 -c40 -d30s http://localhost:3000/ | grep "Requests/sec" | awk '{print $2}')
        log INFO "Performance baseline: $perf_result requests/sec"
        
        # Store performance metrics for comparison
        echo "$perf_result" > "$TEMP_DIR/performance_baseline"
    fi
    
    # Cleanup test environment
    docker-compose -f docker-compose.test.yml down
    
    log INFO "All deployment tests passed"
}

verify_deployment() {
    log INFO "Verifying deployment..."
    
    # Health checks
    local health_endpoints=("http://localhost/api/health" "http://localhost/metrics" "http://localhost/api/version")
    
    for endpoint in "${health_endpoints[@]}"; do
        local response=$(curl -f "$endpoint" 2>/dev/null)
        if [[ $? -ne 0 ]]; then
            error_exit "Health check failed for $endpoint"
        fi
        log INFO "Health check passed: $endpoint"
    done
    
    # Database connectivity
    if ! docker-compose exec -T db pg_isready; then
        error_exit "Database connectivity check failed"
    fi
    
    # Redis connectivity
    if ! docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        error_exit "Redis connectivity check failed"
    fi
    
    # WAF functionality
    if [[ "$WAF_ENABLED" == "true" ]]; then
        # Test that WAF blocks malicious requests
        local waf_test_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/?union+select")
        if [[ "$waf_test_response" != "403" ]]; then
            log WARN "WAF may not be properly configured (expected 403, got $waf_test_response)"
        else
            log INFO "WAF is properly blocking malicious requests"
        fi
    fi
    
    # SSL/TLS verification
    if [[ -f "/certs/server.crt" ]]; then
        if openssl x509 -in /certs/server.crt -checkend 86400 -noout; then
            log INFO "SSL certificate is valid and not expiring within 24 hours"
        else
            log WARN "SSL certificate expires within 24 hours"
        fi
    fi
    
    # Application-specific checks
    verify_application_functionality
    
    log INFO "Deployment verification completed successfully"
}

verify_application_functionality() {
    log INFO "Verifying application functionality..."
    
    # Test event listing
    local events_response=$(curl -s -f "http://localhost/api/events")
    if [[ $? -ne 0 ]]; then
        error_exit "Events API is not responding"
    fi
    
    # Test authentication endpoint
    local auth_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/auth/status")
    if [[ "$auth_response" != "200" ]]; then
        error_exit "Authentication API is not responding (HTTP $auth_response)"
    fi
    
    # Test metrics endpoint
    local metrics_response=$(curl -s "http://localhost/metrics")
    if ! echo "$metrics_response" | grep -q "http_requests_total"; then
        error_exit "Metrics endpoint is not providing expected metrics"
    fi
    
    log INFO "Application functionality verification passed"
}

create_deployment_backup() {
    log INFO "Creating deployment backup..."
    
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="$BACKUP_DIR/deploy-$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Database backup
    log INFO "Backing up database..."
    docker-compose exec -T db pg_dump "$DATABASE_URL" | gzip > "$backup_path/database.sql.gz"
    
    # Redis backup
    log INFO "Backing up Redis data..."
    docker-compose exec -T redis redis-cli --rdb /tmp/dump.rdb >/dev/null
    docker-compose exec -T redis cat /tmp/dump.rdb > "$backup_path/redis.rdb"
    
    # Application state backup
    log INFO "Backing up application state..."
    docker-compose exec -T app tar -czf - /app/uploads 2>/dev/null > "$backup_path/uploads.tar.gz" || true
    docker-compose exec -T app tar -czf - /app/logs 2>/dev/null > "$backup_path/logs.tar.gz" || true
    
    # Configuration backup
    cp -r "$PROJECT_ROOT"/{.env*,docker-compose*.yml} "$backup_path/" 2>/dev/null || true
    
    # Create backup manifest
    cat > "$backup_path/manifest.json" <<EOF
{
    "timestamp": "$backup_timestamp",
    "version_before": "$(docker images billetterie:latest --format '{{.Tag}}' | head -1)",
    "version_after": "$VERSION",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "environment": "$ENVIRONMENT",
    "deployment_mode": "$DEPLOYMENT_MODE",
    "backup_components": ["database", "redis", "uploads", "logs", "config"]
}
EOF
    
    echo "$backup_path" > "$TEMP_DIR/backup_path"
    log INFO "Deployment backup created at $backup_path"
}

emergency_rollback() {
    log INFO "Initiating emergency rollback..."
    
    local backup_path
    if [[ -f "$TEMP_DIR/backup_path" ]]; then
        backup_path=$(cat "$TEMP_DIR/backup_path")
    else
        # Find most recent backup
        backup_path=$(find "$BACKUP_DIR" -name "deploy-*" -type d | sort -r | head -1)
    fi
    
    if [[ -z "$backup_path" ]] || [[ ! -d "$backup_path" ]]; then
        error_exit "No backup found for emergency rollback"
    fi
    
    log INFO "Rolling back using backup: $backup_path"
    
    # Stop current services
    docker-compose down
    
    # Restore database
    if [[ -f "$backup_path/database.sql.gz" ]]; then
        log INFO "Restoring database..."
        zcat "$backup_path/database.sql.gz" | docker-compose exec -T db psql "$DATABASE_URL"
    fi
    
    # Restore Redis
    if [[ -f "$backup_path/redis.rdb" ]]; then
        log INFO "Restoring Redis data..."
        docker-compose exec -T redis redis-cli FLUSHALL
        cat "$backup_path/redis.rdb" | docker-compose exec -T redis redis-cli --pipe
    fi
    
    # Restore application state
    if [[ -f "$backup_path/uploads.tar.gz" ]]; then
        docker-compose exec -T app tar -xzf - -C / < "$backup_path/uploads.tar.gz"
    fi
    
    # Start services with previous configuration
    docker-compose up -d
    
    # Verify rollback
    if ! curl -f http://localhost/api/health >/dev/null 2>&1; then
        error_exit "Emergency rollback verification failed"
    fi
    
    log INFO "Emergency rollback completed successfully"
    send_alert "WARNING" "Emergency Rollback Completed" "System rolled back to backup from $backup_path"
}

cleanup_old_deployments() {
    log INFO "Cleaning up old deployments..."
    
    # Remove old Docker images (keep last 3 versions)
    local old_images=$(docker images billetterie --format "{{.Tag}}" | grep -E '^[0-9]{8}-[0-9]{6}$' | sort -r | tail -n +4)
    for tag in $old_images; do
        docker rmi "billetterie:$tag" >/dev/null 2>&1 || true
        log INFO "Removed old image: billetterie:$tag"
    done
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "deploy-*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    # Clean up Docker system
    docker system prune -f >/dev/null 2>&1 || true
    
    log INFO "Cleanup completed"
}

cleanup_on_failure() {
    log INFO "Cleaning up after failure..."
    
    # Remove any temporary files
    rm -rf "$TEMP_DIR" >/dev/null 2>&1 || true
    
    # Remove any dangling images from failed build
    docker image prune -f >/dev/null 2>&1 || true
    
    log INFO "Failure cleanup completed"
}

display_deployment_summary() {
    log INFO "=== DEPLOYMENT SUMMARY ==="
    log INFO "Version: $VERSION"
    log INFO "Environment: $ENVIRONMENT"
    log INFO "Mode: $DEPLOYMENT_MODE"
    log INFO "Security Level: $SECURITY_LEVEL"
    log INFO "Start Time: $(cat "$TEMP_DIR/start_time" 2>/dev/null || echo "Unknown")"
    log INFO "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if [[ -f "$TEMP_DIR/performance_baseline" ]]; then
        local perf=$(cat "$TEMP_DIR/performance_baseline")
        log INFO "Performance: $perf requests/sec"
    fi
    
    log INFO "=== END SUMMARY ==="
}

main() {
    # Initialize
    mkdir -p "$LOG_DIR" "$TEMP_DIR" "$BACKUP_DIR"
    echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$TEMP_DIR/start_time"
    
    log INFO "${ROCKET} Starting Billetterie Advanced Deployment"
    log INFO "Version: $VERSION | Environment: $ENVIRONMENT | Mode: $DEPLOYMENT_MODE"
    
    # Trap for cleanup
    trap cleanup_on_failure EXIT
    
    # Send start notification
    send_alert "INFO" "Deployment Started" "Starting deployment of version $VERSION"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "=== DRY RUN MODE ==="
        validate_security_context
        run_preflight_checks
        run_security_scan
        log INFO "Dry run completed successfully"
        return 0
    fi
    
    # Execute deployment pipeline
    validate_security_context
    run_preflight_checks
    run_security_scan
    
    case "$DEPLOYMENT_MODE" in
        zero-downtime)
            deploy_zero_downtime
            ;;
        maintenance)
            deploy_with_maintenance
            ;;
        emergency)
            deploy_emergency
            ;;
        *)
            error_exit "Unknown deployment mode: $DEPLOYMENT_MODE"
            ;;
    esac
    
    # Final steps
    display_deployment_summary
    send_alert "INFO" "Deployment Completed" "Version $VERSION deployed successfully"
    
    # Remove trap and cleanup temp files
    trap - EXIT
    rm -rf "$TEMP_DIR"
    
    log INFO "${CHECK_MARK} Deployment completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
