#!/bin/bash

# Billetterie Security Incident Response and Automated Mitigation
# This script handles security incidents, threat detection, and automated response

set -euo pipefail
IFS=$'\n\t'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="/var/log/billetterie/security"
readonly INCIDENT_LOG="$LOG_DIR/incidents.log"
readonly THREAT_LOG="$LOG_DIR/threats.log"
readonly RESPONSE_LOG="$LOG_DIR/responses.log"
readonly QUARANTINE_DIR="/var/quarantine"
readonly EVIDENCE_DIR="/var/evidence"

# Security settings
THREAT_DETECTION_MODE="${THREAT_DETECTION_MODE:-active}" # active, passive, learning
AUTO_MITIGATION="${AUTO_MITIGATION:-true}"
INCIDENT_SEVERITY_THRESHOLD="${INCIDENT_SEVERITY_THRESHOLD:-medium}"
RESPONSE_TIME_SLA="${RESPONSE_TIME_SLA:-300}" # 5 minutes
FORENSICS_ENABLED="${FORENSICS_ENABLED:-true}"
THREAT_INTEL_FEEDS="${THREAT_INTEL_FEEDS:-true}"

# Monitoring integrations
SIEM_ENDPOINT="${SIEM_ENDPOINT:-http://elasticsearch:9200}"
THREAT_INTEL_API="${THREAT_INTEL_API:-https://api.threatintel.com}"
VULNERABILITY_SCANNER="${VULNERABILITY_SCANNER:-trivy}"
INTRUSION_DETECTION="${INTRUSION_DETECTION:-suricata}"

# Response team contacts
SECURITY_TEAM_EMAIL="${SECURITY_TEAM_EMAIL:-security@billetterie.com}"
SOC_PHONE="${SOC_PHONE:-}"
INCIDENT_COMMANDER="${INCIDENT_COMMANDER:-}"
FORENSICS_TEAM="${FORENSICS_TEAM:-}"

# Colors and symbols
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

readonly ALERT='🚨'
readonly SHIELD='🛡️'
readonly LOCK='🔒'
readonly DETECTIVE='🕵️'
readonly FIRE='🔥'
readonly LIGHTNING='⚡'

# Logging functions
security_log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local incident_id=$(cat /dev/urandom | tr -dc 'A-Z0-9' | fold -w 8 | head -n 1)
    
    case "$level" in
        CRITICAL)
            echo -e "${RED}${FIRE} [${timestamp}] CRITICAL-${incident_id}: ${message}${NC}" >&2
            ;;
        HIGH)
            echo -e "${RED}${ALERT} [${timestamp}] HIGH-${incident_id}: ${message}${NC}" >&2
            ;;
        MEDIUM)
            echo -e "${YELLOW}${SHIELD} [${timestamp}] MEDIUM-${incident_id}: ${message}${NC}" >&2
            ;;
        LOW)
            echo -e "${BLUE}${DETECTIVE} [${timestamp}] LOW-${incident_id}: ${message}${NC}"
            ;;
        INFO)
            echo -e "${GREEN}[${timestamp}] INFO-${incident_id}: ${message}${NC}"
            ;;
        FORENSIC)
            echo -e "${PURPLE}${DETECTIVE} [${timestamp}] FORENSIC-${incident_id}: ${message}${NC}"
            ;;
    esac
    
    # Write to appropriate log files
    mkdir -p "$LOG_DIR"
    echo "[${timestamp}] ${level}-${incident_id}: ${message}" >> "$INCIDENT_LOG"
    
    if [[ "$level" =~ ^(CRITICAL|HIGH|MEDIUM)$ ]]; then
        echo "[${timestamp}] ${level}-${incident_id}: ${message}" >> "$THREAT_LOG"
    fi
    
    # Send to SIEM
    send_to_siem "$level" "$incident_id" "$message"
    
    # Return incident ID for tracking
    echo "$incident_id"
}

send_to_siem() {
    local level="$1"
    local incident_id="$2"
    local message="$3"
    
    if [[ -n "$SIEM_ENDPOINT" ]]; then
        local severity_score=0
        case "$level" in
            CRITICAL) severity_score=10 ;;
            HIGH) severity_score=8 ;;
            MEDIUM) severity_score=6 ;;
            LOW) severity_score=4 ;;
            *) severity_score=2 ;;
        esac
        
        curl -X POST "$SIEM_ENDPOINT/security-incidents/_doc" \
            -H "Content-Type: application/json" \
            -d "{
                \"timestamp\": \"$(date -Iseconds)\",
                \"incident_id\": \"$incident_id\",
                \"severity\": \"$level\",
                \"severity_score\": $severity_score,
                \"message\": \"$message\",
                \"source\": \"billetterie-security\",
                \"environment\": \"production\",
                \"host\": \"$(hostname)\",
                \"service\": \"security-response\"
            }" >/dev/null 2>&1 || true
    fi
}

critical_security_alert() {
    local message="$*"
    local incident_id=$(security_log CRITICAL "$message")
    
    # Immediate escalation for critical incidents
    escalate_incident "CRITICAL" "$incident_id" "$message"
    
    # Auto-activate incident response if enabled
    if [[ "$AUTO_MITIGATION" == "true" ]]; then
        activate_incident_response "$incident_id" "CRITICAL" "$message"
    fi
    
    echo "$incident_id"
}

escalate_incident() {
    local severity="$1"
    local incident_id="$2"
    local message="$3"
    
    # PagerDuty escalation for critical incidents
    if [[ "$severity" == "CRITICAL" ]] && [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        curl -X POST 'https://events.pagerduty.com/v2/enqueue' \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"dedup_key\": \"$incident_id\",
                \"payload\": {
                    \"summary\": \"CRITICAL Security Incident: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"billetterie-security\",
                    \"component\": \"security-monitoring\",
                    \"group\": \"security\",
                    \"class\": \"security-incident\",
                    \"custom_details\": {
                        \"incident_id\": \"$incident_id\",
                        \"detection_time\": \"$(date -Iseconds)\",
                        \"affected_system\": \"billetterie-production\"
                    }
                }
            }" >/dev/null 2>&1 || true
    fi
    
    # Email security team
    if [[ -n "$SECURITY_TEAM_EMAIL" ]] && command -v mail >/dev/null 2>&1; then
        cat <<EOF | mail -s "[$severity] Security Incident $incident_id" "$SECURITY_TEAM_EMAIL"
SECURITY INCIDENT ALERT

Incident ID: $incident_id
Severity: $severity
Time: $(date)
Message: $message

Immediate action may be required.

View incident details: https://security.billetterie.com/incidents/$incident_id
Runbook: https://docs.billetterie.com/security/incident-response

This is an automated alert from the Billetterie Security Response System.
EOF
    fi
    
    # Slack security channel
    if [[ -n "${SLACK_SECURITY_WEBHOOK:-}" ]]; then
        local color="danger"
        local emoji="$FIRE"
        
        case "$severity" in
            MEDIUM) color="warning"; emoji="$ALERT" ;;
            LOW) color="good"; emoji="$SHIELD" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"channel\": \"#security-incidents\",
                \"text\": \"$emoji Security Incident $incident_id\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$severity Security Incident\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Incident ID\",
                        \"value\": \"$incident_id\",
                        \"short\": true
                    }, {
                        \"title\": \"Time\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }],
                    \"actions\": [{
                        \"type\": \"button\",
                        \"text\": \"View Incident\",
                        \"url\": \"https://security.billetterie.com/incidents/$incident_id\"
                    }]
                }]
            }" \
            "$SLACK_SECURITY_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Threat detection functions
detect_brute_force_attacks() {
    security_log INFO "Monitoring for brute force attacks..."
    
    # Analyze authentication logs
    local suspicious_ips=($(grep "authentication failed" /var/log/billetterie/auth.log 2>/dev/null | \
        awk '{print $8}' | sort | uniq -c | awk '$1 > 10 {print $2}' || true))
    
    for ip in "${suspicious_ips[@]}"; do
        local attempt_count=$(grep "authentication failed.*$ip" /var/log/billetterie/auth.log | wc -l)
        if [[ $attempt_count -gt 20 ]]; then
            local incident_id=$(security_log HIGH "Brute force attack detected from IP: $ip ($attempt_count attempts)")
            block_malicious_ip "$ip" "brute-force" "$incident_id"
        fi
    done
    
    # Check for rapid-fire requests
    local current_minute=$(date +%Y-%m-%d\ %H:%M)
    local high_frequency_ips=($(grep "$current_minute" /var/log/nginx/access.log 2>/dev/null | \
        awk '{print $1}' | sort | uniq -c | awk '$1 > 100 {print $2}' || true))
    
    for ip in "${high_frequency_ips[@]}"; do
        local request_count=$(grep "$current_minute.*$ip" /var/log/nginx/access.log | wc -l)
        local incident_id=$(security_log MEDIUM "High frequency requests from IP: $ip ($request_count requests/minute)")
        rate_limit_ip "$ip" "high-frequency" "$incident_id"
    done
}

detect_sql_injection_attempts() {
    security_log INFO "Scanning for SQL injection attempts..."
    
    local sql_patterns=(
        "union.*select"
        "or.*1.*=.*1"
        "drop.*table"
        "insert.*into"
        "delete.*from"
        "update.*set"
        "'.*or.*'.*'.*="
    )
    
    for pattern in "${sql_patterns[@]}"; do
        local suspicious_requests=$(grep -i "$pattern" /var/log/nginx/access.log 2>/dev/null | head -20)
        
        while IFS= read -r request; do
            if [[ -n "$request" ]]; then
                local ip=$(echo "$request" | awk '{print $1}')
                local user_agent=$(echo "$request" | cut -d'"' -f6)
                local incident_id=$(security_log HIGH "SQL injection attempt detected from IP: $ip, Pattern: $pattern")
                
                # Immediate blocking for SQL injection attempts
                block_malicious_ip "$ip" "sql-injection" "$incident_id"
                
                # Log for forensics
                forensic_log "$incident_id" "sql-injection" "$request"
            fi
        done <<< "$suspicious_requests"
    done
}

detect_xss_attempts() {
    security_log INFO "Monitoring for XSS attempts..."
    
    local xss_patterns=(
        "<script"
        "javascript:"
        "onload="
        "onerror="
        "alert("
        "document.cookie"
        "eval("
    )
    
    for pattern in "${xss_patterns[@]}"; do
        local suspicious_requests=$(grep -i "$pattern" /var/log/nginx/access.log 2>/dev/null | head -10)
        
        while IFS= read -r request; do
            if [[ -n "$request" ]]; then
                local ip=$(echo "$request" | awk '{print $1}')
                local incident_id=$(security_log MEDIUM "XSS attempt detected from IP: $ip, Pattern: $pattern")
                
                # Rate limit for XSS attempts
                rate_limit_ip "$ip" "xss-attempt" "$incident_id"
                
                forensic_log "$incident_id" "xss-attempt" "$request"
            fi
        done <<< "$suspicious_requests"
    done
}

detect_suspicious_file_access() {
    security_log INFO "Monitoring for suspicious file access..."
    
    local suspicious_paths=(
        "/etc/passwd"
        "/etc/shadow"
        "/.env"
        "/config"
        "../"
        "/.git"
        "/admin"
        "/wp-admin"
        "/phpmyadmin"
    )
    
    for path in "${suspicious_paths[@]}"; do
        local suspicious_requests=$(grep -i "$path" /var/log/nginx/access.log 2>/dev/null | head -10)
        
        while IFS= read -r request; do
            if [[ -n "$request" ]]; then
                local ip=$(echo "$request" | awk '{print $1}')
                local status_code=$(echo "$request" | awk '{print $9}')
                local incident_id=$(security_log MEDIUM "Suspicious file access attempt from IP: $ip, Path: $path, Status: $status_code")
                
                # Block if accessing sensitive files
                if [[ "$path" =~ ^(/etc/|/.env|/config) ]]; then
                    block_malicious_ip "$ip" "file-access" "$incident_id"
                else
                    rate_limit_ip "$ip" "suspicious-access" "$incident_id"
                fi
                
                forensic_log "$incident_id" "file-access" "$request"
            fi
        done <<< "$suspicious_requests"
    done
}

detect_malware_upload_attempts() {
    security_log INFO "Scanning for malware upload attempts..."
    
    # Monitor upload directory for suspicious files
    if [[ -d "/app/uploads" ]]; then
        find /app/uploads -type f -name "*.php" -o -name "*.jsp" -o -name "*.asp" -o -name "*.exe" -o -name "*.sh" -newer /tmp/last_scan 2>/dev/null | \
        while IFS= read -r suspicious_file; do
            local incident_id=$(security_log HIGH "Suspicious file upload detected: $suspicious_file")
            quarantine_file "$suspicious_file" "$incident_id"
        done
    fi
    
    touch /tmp/last_scan
    
    # Check for files with suspicious content
    find /app/uploads -type f -exec grep -l "eval(" {} \; 2>/dev/null | \
    while IFS= read -r suspicious_file; do
        local incident_id=$(security_log HIGH "File with suspicious content detected: $suspicious_file")
        quarantine_file "$suspicious_file" "$incident_id"
    done
}

# Automated response functions
block_malicious_ip() {
    local ip="$1"
    local reason="$2"
    local incident_id="$3"
    
    security_log INFO "Blocking malicious IP: $ip (Reason: $reason, Incident: $incident_id)"
    
    # Add to iptables
    iptables -I INPUT -s "$ip" -j DROP 2>/dev/null || true
    
    # Add to fail2ban jail
    if command -v fail2ban-client >/dev/null 2>&1; then
        fail2ban-client set nginx-limit-req banip "$ip" || true
    fi
    
    # Add to WAF blocklist
    if [[ -f "/etc/nginx/conf.d/blocked-ips.conf" ]]; then
        echo "deny $ip;" >> /etc/nginx/conf.d/blocked-ips.conf
        nginx -s reload || true
    fi
    
    # Update threat intelligence database
    update_threat_intel_db "$ip" "$reason" "$incident_id"
    
    security_log INFO "IP $ip blocked successfully"
}

rate_limit_ip() {
    local ip="$1"
    local reason="$2"
    local incident_id="$3"
    
    security_log INFO "Rate limiting IP: $ip (Reason: $reason, Incident: $incident_id)"
    
    # Add strict rate limiting for this IP
    if [[ -f "/etc/nginx/conf.d/rate-limits.conf" ]]; then
        echo "limit_req_zone \$binary_remote_addr zone=$ip:1m rate=1r/m;" >> /etc/nginx/conf.d/rate-limits.conf
        nginx -s reload || true
    fi
    
    security_log INFO "Rate limiting applied to IP $ip"
}

quarantine_file() {
    local file_path="$1"
    local incident_id="$2"
    
    security_log INFO "Quarantining suspicious file: $file_path (Incident: $incident_id)"
    
    mkdir -p "$QUARANTINE_DIR/$incident_id"
    
    # Move file to quarantine
    mv "$file_path" "$QUARANTINE_DIR/$incident_id/" 2>/dev/null || {
        # If move fails, copy and delete
        cp "$file_path" "$QUARANTINE_DIR/$incident_id/" 2>/dev/null || true
        rm -f "$file_path" 2>/dev/null || true
    }
    
    # Create quarantine record
    cat > "$QUARANTINE_DIR/$incident_id/info.json" <<EOF
{
    "incident_id": "$incident_id",
    "original_path": "$file_path",
    "quarantine_time": "$(date -Iseconds)",
    "file_hash": "$(sha256sum "$QUARANTINE_DIR/$incident_id/$(basename "$file_path")" 2>/dev/null | awk '{print $1}' || echo 'unknown')",
    "file_size": "$(stat -c%s "$QUARANTINE_DIR/$incident_id/$(basename "$file_path")" 2>/dev/null || echo 'unknown')"
}
EOF
    
    security_log INFO "File quarantined: $file_path -> $QUARANTINE_DIR/$incident_id/"
}

activate_incident_response() {
    local incident_id="$1"
    local severity="$2"
    local description="$3"
    
    security_log INFO "Activating incident response for incident $incident_id"
    
    # Create incident response directory
    mkdir -p "/var/incidents/$incident_id"
    
    # Initialize incident response
    cat > "/var/incidents/$incident_id/incident.json" <<EOF
{
    "incident_id": "$incident_id",
    "severity": "$severity",
    "description": "$description",
    "created_time": "$(date -Iseconds)",
    "status": "active",
    "response_team": [],
    "actions_taken": [],
    "evidence_collected": [],
    "timeline": [{
        "timestamp": "$(date -Iseconds)",
        "event": "Incident created",
        "details": "Automated detection triggered incident response"
    }]
}
EOF
    
    # Collect initial evidence
    collect_incident_evidence "$incident_id"
    
    # Initiate containment procedures
    initiate_containment "$incident_id" "$severity"
    
    # Update incident status
    update_incident_status "$incident_id" "containment" "Automated containment procedures initiated"
    
    security_log INFO "Incident response activated for $incident_id"
}

collect_incident_evidence() {
    local incident_id="$1"
    local evidence_dir="/var/incidents/$incident_id/evidence"
    
    mkdir -p "$evidence_dir"
    
    security_log FORENSIC "Collecting evidence for incident $incident_id"
    
    # System state
    ps aux > "$evidence_dir/processes.txt"
    netstat -tulpn > "$evidence_dir/network_connections.txt"
    ss -tulpn > "$evidence_dir/socket_stats.txt"
    lsof > "$evidence_dir/open_files.txt"
    
    # System logs
    cp /var/log/nginx/access.log "$evidence_dir/nginx_access.log" 2>/dev/null || true
    cp /var/log/nginx/error.log "$evidence_dir/nginx_error.log" 2>/dev/null || true
    cp /var/log/billetterie/*.log "$evidence_dir/" 2>/dev/null || true
    
    # Docker container logs
    docker-compose logs --timestamps --no-color > "$evidence_dir/docker_logs.txt" 2>/dev/null || true
    
    # Database activity (if accessible)
    docker-compose exec -T db psql "$DATABASE_URL" -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000;" > "$evidence_dir/audit_logs.txt" 2>/dev/null || true
    
    # System configuration
    cp /etc/nginx/nginx.conf "$evidence_dir/" 2>/dev/null || true
    cp /etc/hosts "$evidence_dir/" 2>/dev/null || true
    
    # Create evidence hash
    find "$evidence_dir" -type f -exec sha256sum {} \; > "$evidence_dir/evidence_hashes.txt"
    
    security_log FORENSIC "Evidence collection completed for incident $incident_id"
}

initiate_containment() {
    local incident_id="$1"
    local severity="$2"
    
    security_log INFO "Initiating containment for incident $incident_id (Severity: $severity)"
    
    case "$severity" in
        CRITICAL)
            # Aggressive containment for critical incidents
            
            # Isolate affected systems
            security_log INFO "Isolating affected systems..."
            
            # Enable maintenance mode
            touch /app/maintenance.flag
            
            # Restrict network access
            iptables -I INPUT -p tcp --dport 80 -j DROP 2>/dev/null || true
            iptables -I INPUT -p tcp --dport 443 -j DROP 2>/dev/null || true
            
            # Allow access only from trusted IPs
            local trusted_ips=("${TRUSTED_IPS[@]:-}")
            for ip in "${trusted_ips[@]}"; do
                iptables -I INPUT -s "$ip" -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
                iptables -I INPUT -s "$ip" -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
            done
            ;;
            
        HIGH)
            # Moderate containment
            
            # Enable WAF strict mode
            if [[ -f "/etc/nginx/conf.d/waf.conf" ]]; then
                sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' /etc/nginx/conf.d/waf.conf
                nginx -s reload || true
            fi
            
            # Increase logging verbosity
            increase_logging_level
            ;;
            
        MEDIUM)
            # Light containment
            
            # Enable additional monitoring
            enable_enhanced_monitoring
            ;;
    esac
    
    security_log INFO "Containment measures activated for incident $incident_id"
}

update_incident_status() {
    local incident_id="$1"
    local status="$2"
    local details="$3"
    
    if [[ -f "/var/incidents/$incident_id/incident.json" ]]; then
        # Update incident file
        local temp_file=$(mktemp)
        jq --arg status "$status" --arg timestamp "$(date -Iseconds)" --arg details "$details" \
           '.status = $status | .timeline += [{"timestamp": $timestamp, "event": "Status updated", "details": $details}]' \
           "/var/incidents/$incident_id/incident.json" > "$temp_file"
        mv "$temp_file" "/var/incidents/$incident_id/incident.json"
    fi
    
    security_log INFO "Incident $incident_id status updated to: $status"
}

forensic_log() {
    local incident_id="$1"
    local attack_type="$2"
    local request_data="$3"
    
    mkdir -p "$EVIDENCE_DIR/$incident_id"
    
    # Store forensic data
    cat >> "$EVIDENCE_DIR/$incident_id/attack_details.log" <<EOF
[$(date -Iseconds)] Attack Type: $attack_type
Request Data: $request_data
Source IP: $(echo "$request_data" | awk '{print $1}')
User Agent: $(echo "$request_data" | cut -d'"' -f6)
Timestamp: $(echo "$request_data" | awk '{print $4}' | tr -d '[')
---
EOF
    
    security_log FORENSIC "Forensic data logged for incident $incident_id"
}

update_threat_intel_db() {
    local ip="$1"
    local reason="$2"
    local incident_id="$3"
    
    # Update local threat intelligence database
    local threat_db="/var/lib/billetterie/threat-intel.json"
    mkdir -p "$(dirname "$threat_db")"
    
    if [[ ! -f "$threat_db" ]]; then
        echo "[]" > "$threat_db"
    fi
    
    # Add IP to threat database
    local temp_file=$(mktemp)
    jq --arg ip "$ip" --arg reason "$reason" --arg incident "$incident_id" --arg timestamp "$(date -Iseconds)" \
       '. += [{"ip": $ip, "reason": $reason, "incident_id": $incident, "first_seen": $timestamp, "last_seen": $timestamp, "threat_score": 8}]' \
       "$threat_db" > "$temp_file"
    mv "$temp_file" "$threat_db"
    
    # Share with external threat intel platforms
    if [[ -n "$THREAT_INTEL_API" ]] && [[ -n "${THREAT_INTEL_API_KEY:-}" ]]; then
        curl -X POST "$THREAT_INTEL_API/indicators" \
            -H "Authorization: Bearer $THREAT_INTEL_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"indicator\": \"$ip\",
                \"type\": \"ip\",
                \"threat_type\": \"$reason\",
                \"confidence\": 85,
                \"source\": \"billetterie-security\",
                \"incident_id\": \"$incident_id\"
            }" >/dev/null 2>&1 || true
    fi
}

increase_logging_level() {
    security_log INFO "Increasing logging verbosity for enhanced monitoring"
    
    # Nginx logging
    sed -i 's/error_log.*error;/error_log \/var\/log\/nginx\/error.log debug;/' /etc/nginx/nginx.conf
    
    # Application logging
    if docker-compose exec -T app test -f /app/.env.production; then
        docker-compose exec -T app sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' /app/.env.production
        docker-compose restart app1 app2
    fi
    
    nginx -s reload || true
}

enable_enhanced_monitoring() {
    security_log INFO "Enabling enhanced security monitoring"
    
    # Start additional monitoring processes
    if command -v auditd >/dev/null 2>&1; then
        systemctl start auditd || service auditd start || true
    fi
    
    # Enable detailed access logging
    if [[ -f "/etc/nginx/conf.d/logging.conf" ]]; then
        echo 'log_format detailed "$remote_addr - $remote_user [$time_local] \"$request\" $status $bytes_sent \"$http_referer\" \"$http_user_agent\" \"$request_time\" \"$upstream_response_time\"";' > /etc/nginx/conf.d/logging.conf
        nginx -s reload || true
    fi
}

# Continuous monitoring
continuous_threat_monitoring() {
    security_log INFO "Starting continuous threat monitoring..."
    
    while true; do
        local monitoring_start=$(date +%s)
        
        # Run threat detection functions
        detect_brute_force_attacks
        detect_sql_injection_attempts
        detect_xss_attempts
        detect_suspicious_file_access
        detect_malware_upload_attempts
        
        # Check system integrity
        check_system_integrity
        
        # Monitor for insider threats
        monitor_insider_threats
        
        # Check threat intelligence feeds
        update_threat_intelligence
        
        # Performance monitoring to detect anomalies
        monitor_performance_anomalies
        
        local monitoring_end=$(date +%s)
        local monitoring_duration=$((monitoring_end - monitoring_start))
        
        security_log INFO "Threat monitoring cycle completed in ${monitoring_duration}s"
        
        # Sleep before next cycle
        sleep 60
    done
}

check_system_integrity() {
    security_log INFO "Checking system integrity..."
    
    # Check for unauthorized changes to critical files
    local critical_files=(
        "/etc/passwd"
        "/etc/shadow"
        "/etc/sudoers"
        "/app/.env.production"
        "/etc/nginx/nginx.conf"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            local current_hash=$(sha256sum "$file" | awk '{print $1}')
            local stored_hash_file="/var/lib/billetterie/integrity/$(echo "$file" | tr '/' '_').hash"
            
            if [[ -f "$stored_hash_file" ]]; then
                local stored_hash=$(cat "$stored_hash_file")
                if [[ "$current_hash" != "$stored_hash" ]]; then
                    local incident_id=$(security_log HIGH "System integrity violation: $file has been modified")
                    forensic_log "$incident_id" "integrity-violation" "File: $file, Expected: $stored_hash, Actual: $current_hash"
                fi
            else
                # Store initial hash
                mkdir -p "$(dirname "$stored_hash_file")"
                echo "$current_hash" > "$stored_hash_file"
            fi
        fi
    done
}

monitor_insider_threats() {
    security_log INFO "Monitoring for insider threat indicators..."
    
    # Check for unusual admin activity
    local admin_activity=$(grep "admin\|sudo\|su " /var/log/auth.log 2>/dev/null | tail -50 || true)
    
    # Check for unusual database access patterns
    if docker-compose exec -T db psql "$DATABASE_URL" -c "SELECT user_id, COUNT(*) as access_count FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY user_id HAVING COUNT(*) > 100;" 2>/dev/null | grep -q "[0-9]"; then
        security_log MEDIUM "Unusual database access patterns detected"
    fi
    
    # Monitor for privilege escalation attempts
    grep -i "privilege\|escalation\|root" /var/log/syslog 2>/dev/null | tail -10 | \
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            security_log MEDIUM "Potential privilege escalation attempt: $line"
        fi
    done
}

update_threat_intelligence() {
    security_log INFO "Updating threat intelligence feeds..."
    
    if [[ "$THREAT_INTEL_FEEDS" == "true" ]] && [[ -n "$THREAT_INTEL_API" ]]; then
        # Download latest threat indicators
        curl -s "$THREAT_INTEL_API/indicators/recent" \
            -H "Authorization: Bearer ${THREAT_INTEL_API_KEY:-}" \
            -o /tmp/threat_intel.json 2>/dev/null || return
        
        # Process threat indicators
        if [[ -f /tmp/threat_intel.json ]]; then
            jq -r '.indicators[] | select(.type == "ip") | .value' /tmp/threat_intel.json 2>/dev/null | \
            while IFS= read -r malicious_ip; do
                if [[ -n "$malicious_ip" ]]; then
                    # Check if IP is in current access logs
                    if grep -q "$malicious_ip" /var/log/nginx/access.log 2>/dev/null; then
                        local incident_id=$(security_log HIGH "Known malicious IP detected in access logs: $malicious_ip")
                        block_malicious_ip "$malicious_ip" "threat-intel" "$incident_id"
                    fi
                fi
            done
        fi
    fi
}

monitor_performance_anomalies() {
    security_log INFO "Monitoring for performance anomalies..."
    
    # Check response times
    local avg_response_time=$(grep "$(date '+%d/%b/%Y:%H:%M')" /var/log/nginx/access.log 2>/dev/null | \
        awk '{print $10}' | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    
    if (( $(echo "$avg_response_time > 5.0" | bc -l) )); then
        security_log MEDIUM "Performance anomaly detected: High average response time ($avg_response_time seconds)"
    fi
    
    # Check memory usage
    local memory_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        security_log MEDIUM "Performance anomaly detected: High memory usage ($memory_usage%)"
    fi
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        security_log MEDIUM "Performance anomaly detected: High CPU usage ($cpu_usage%)"
    fi
}

# Main function
main() {
    local command="${1:-monitor}"
    
    case "$command" in
        monitor)
            continuous_threat_monitoring
            ;;
        detect)
            local threat_type="${2:-all}"
            case "$threat_type" in
                brute-force) detect_brute_force_attacks ;;
                sql-injection) detect_sql_injection_attempts ;;
                xss) detect_xss_attempts ;;
                file-access) detect_suspicious_file_access ;;
                malware) detect_malware_upload_attempts ;;
                all)
                    detect_brute_force_attacks
                    detect_sql_injection_attempts
                    detect_xss_attempts
                    detect_suspicious_file_access
                    detect_malware_upload_attempts
                    ;;
            esac
            ;;
        respond)
            local incident_id="${2:-}"
            if [[ -n "$incident_id" ]]; then
                activate_incident_response "$incident_id" "MANUAL" "Manual incident response activation"
            else
                echo "Usage: $0 respond <incident_id>"
                exit 1
            fi
            ;;
        block)
            local ip="${2:-}"
            local reason="${3:-manual}"
            if [[ -n "$ip" ]]; then
                local incident_id=$(security_log HIGH "Manual IP block: $ip (Reason: $reason)")
                block_malicious_ip "$ip" "$reason" "$incident_id"
            else
                echo "Usage: $0 block <ip> [reason]"
                exit 1
            fi
            ;;
        quarantine)
            local file_path="${2:-}"
            if [[ -n "$file_path" ]]; then
                local incident_id=$(security_log HIGH "Manual file quarantine: $file_path")
                quarantine_file "$file_path" "$incident_id"
            else
                echo "Usage: $0 quarantine <file_path>"
                exit 1
            fi
            ;;
        status)
            echo "=== Security Status ==="
            echo "Active Incidents: $(find /var/incidents -name "incident.json" -exec grep -l '"status": "active"' {} \; 2>/dev/null | wc -l)"
            echo "Quarantined Files: $(find "$QUARANTINE_DIR" -type f 2>/dev/null | wc -l)"
            echo "Blocked IPs: $(iptables -L INPUT | grep DROP | wc -l)"
            echo "Threat Intel Entries: $(jq length /var/lib/billetterie/threat-intel.json 2>/dev/null || echo 0)"
            ;;
        *)
            echo "Usage: $0 {monitor|detect|respond|block|quarantine|status}"
            echo ""
            echo "Commands:"
            echo "  monitor                    - Start continuous threat monitoring"
            echo "  detect [type]             - Run specific threat detection"
            echo "  respond <incident_id>     - Activate incident response"
            echo "  block <ip> [reason]       - Block malicious IP"
            echo "  quarantine <file>         - Quarantine suspicious file"
            echo "  status                    - Show security status"
            exit 1
            ;;
    esac
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
