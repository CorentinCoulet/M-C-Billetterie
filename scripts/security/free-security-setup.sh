#!/bin/bash

# =============================================================================
# FREE SECURITY IMPLEMENTATION SCRIPT
# Implements essential security without paid tools
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 FREE SECURITY HARDENING SCRIPT${NC}"
echo "======================================"

# 1. Check and create SSL certificates (self-signed for dev)
create_ssl_certificates() {
    echo -e "${BLUE}📜 Creating SSL Certificates...${NC}"
    
    mkdir -p docker/ssl
    
    if [ ! -f "docker/ssl/server.crt" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/ssl/server.key \
            -out docker/ssl/server.crt \
            -subj "/C=FR/ST=France/L=Paris/O=Billetterie/CN=localhost"
        
        echo -e "${GREEN}✅ SSL certificates created${NC}"
    else
        echo -e "${GREEN}✅ SSL certificates already exist${NC}"
    fi
}

# 2. Create hardened Nginx configuration
create_nginx_config() {
    echo -e "${BLUE}🌐 Creating Hardened Nginx Configuration...${NC}"
    
    mkdir -p docker
    
    cat > docker/nginx-secure.conf << 'EOF'
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; font-src 'self' https://fonts.gstatic.com;" always;
    
    # Hide server information
    server_tokens off;
    more_clear_headers Server;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    
    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name _;
        
        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        
        # Security
        limit_conn conn_limit_per_ip 20;
        limit_req zone=api burst=20 nodelay;
        
        # Logging
        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log warn;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://web:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
            
            # Timeout settings
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Auth routes with stricter limits
        location /api/auth/ {
            limit_req zone=login burst=3 nodelay;
            proxy_pass http://web:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
        }
        
        # Health check
        location /health {
            proxy_pass http://web:3000;
            proxy_set_header Host $host;
            access_log off;
        }
        
        # Security.txt
        location /.well-known/security.txt {
            return 200 'Contact: security@yourdomain.com\nExpires: 2024-12-31T23:59:59.000Z';
            add_header Content-Type text/plain;
        }
        
        # Deny access to sensitive files
        location ~ /\. {
            deny all;
        }
        
        location ~* \.(env|log|ini)$ {
            deny all;
        }
    }
}
EOF

    echo -e "${GREEN}✅ Nginx configuration created${NC}"
}

# 3. Create hardened PostgreSQL configuration
create_postgres_config() {
    echo -e "${BLUE}🗄️ Creating Hardened PostgreSQL Configuration...${NC}"
    
    cat > docker/postgresql-hardened.conf << 'EOF'
# PostgreSQL Security Hardened Configuration

# Connection Settings
listen_addresses = '*'
port = 5432
max_connections = 100
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 80MB
max_wal_size = 1GB

# Security Settings
ssl = on
ssl_cert_file = '/var/lib/postgresql/ssl/server.crt'
ssl_key_file = '/var/lib/postgresql/ssl/server.key'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
password_encryption = scram-sha-256

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_truncate_on_rotation = off
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_messages = warning
log_min_error_statement = error
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 10240
log_autovacuum_min_duration = 0
log_error_verbosity = default
log_hostname = off
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'mod'

# Runtime Statistics
track_activities = on
track_counts = on
track_io_timing = on
track_functions = none
stats_temp_directory = 'pg_stat_tmp'

# Autovacuum
autovacuum = on
log_autovacuum_min_duration = 0
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_scale_factor = 0.1

# Security
row_security = on
EOF

    cat > docker/pg_hba-hardened.conf << 'EOF'
# PostgreSQL Client Authentication Configuration File (Security Hardened)

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer

# IPv4 local connections - require SCRAM-SHA-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             172.30.0.0/16           scram-sha-256

# IPv6 local connections
host    all             all             ::1/128                 scram-sha-256

# Deny all other connections
host    all             all             0.0.0.0/0               reject
EOF

    echo -e "${GREEN}✅ PostgreSQL configuration created${NC}"
}

# 4. Create Fail2Ban configuration
create_fail2ban_config() {
    echo -e "${BLUE}🚫 Creating Fail2Ban Configuration...${NC}"
    
    mkdir -p docker/fail2ban/filter.d
    
    cat > docker/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = auto
usedns = warn

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10

[nginx-login]
enabled = true
filter = nginx-login
action = iptables-multiport[name=NoLogin, port="http,https", protocol=tcp]
logpath = /var/log/nginx/access.log
findtime = 600
bantime = 3600
maxretry = 3

[app-security]
enabled = true
filter = app-security
action = iptables-multiport[name=AppSec, port="http,https", protocol=tcp]
logpath = /var/log/app/security.log
findtime = 300
bantime = 7200
maxretry = 1
EOF

    cat > docker/fail2ban/filter.d/nginx-login.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*POST /api/auth/login.*401
ignoreregex =
EOF

    cat > docker/fail2ban/filter.d/app-security.conf << 'EOF'
[Definition]
failregex = ^.*WAF: Blocking malicious request.*ip.*<HOST>
ignoreregex =
EOF

    echo -e "${GREEN}✅ Fail2Ban configuration created${NC}"
}

# 5. Create monitoring configuration
create_monitoring_config() {
    echo -e "${BLUE}📊 Creating Basic Monitoring Configuration...${NC}"
    
    mkdir -p monitoring/grafana/basic-dashboards
    mkdir -p monitoring/grafana/datasources
    
    cat > monitoring/prometheus-basic.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

scrape_configs:
  - job_name: 'billetterie-app'
    static_configs:
      - targets: ['web:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['db:5432']
    scrape_interval: 30s

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF

    cat > monitoring/basic-alerts.yml << 'EOF'
groups:
- name: basic-security
  rules:
  - alert: HighFailedLoginRate
    expr: increase(failed_logins_total[5m]) > 10
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High failed login rate detected"
      description: "More than 10 failed logins in the last 5 minutes"

  - alert: SecurityIncident
    expr: increase(security_incidents_total[1m]) > 0
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "Security incident detected"
      description: "A security incident has been logged"

  - alert: DatabaseDown
    expr: up{job="postgres-exporter"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database is down"

  - alert: ApplicationDown
    expr: up{job="billetterie-app"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Application is down"
EOF

    echo -e "${GREEN}✅ Monitoring configuration created${NC}"
}

# 6. Create secure backup script
create_backup_script() {
    echo -e "${BLUE}💾 Creating Secure Backup Script...${NC}"
    
    cat > scripts/secure-backup.sh << 'EOF'
#!/bin/bash

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="billetterie_backup_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

echo "Starting encrypted backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/$BACKUP_FILE

# Encrypt backup
gpg --batch --yes --cipher-algo AES256 --compress-algo 1 \
    --symmetric --passphrase "$BACKUP_ENCRYPTION_KEY" \
    --output $BACKUP_DIR/$ENCRYPTED_FILE \
    $BACKUP_DIR/$BACKUP_FILE

# Remove unencrypted backup
rm $BACKUP_DIR/$BACKUP_FILE

# Upload to cloud storage if configured
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    aws s3 cp $BACKUP_DIR/$ENCRYPTED_FILE s3://$AWS_S3_BUCKET/backups/ --server-side-encryption AES256
fi

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gpg" -mtime +30 -delete

echo "Backup completed: $ENCRYPTED_FILE"
EOF

    chmod +x scripts/secure-backup.sh
    echo -e "${GREEN}✅ Backup script created${NC}"
}

# 7. Update server.ts to use security middlewares
update_server_security() {
    echo -e "${BLUE}🛡️ Updating server with security middlewares...${NC}"
    
    # Add middlewares to server.ts if not already present
    if ! grep -q "securityHeaders" src/server.ts; then
        sed -i '/import { errorHandler }/a import { securityHeaders } from "./middlewares/security-headers";\nimport { wafMiddleware } from "./middlewares/simple-waf";' src/server.ts
        sed -i '/app.use(express.json/a app.use(securityHeaders());\napp.use(wafMiddleware());' src/server.ts
        echo -e "${GREEN}✅ Security middlewares added to server${NC}"
    fi
}

# 8. Create environment validation
create_env_validation() {
    echo -e "${BLUE}🔍 Creating Environment Validation...${NC}"
    
    cat > scripts/validate-security.sh << 'EOF'
#!/bin/bash

echo "🔍 Validating Security Configuration..."

# Check if required files exist
REQUIRED_FILES=(
    "docker/ssl/server.crt"
    "docker/ssl/server.key"
    "docker/nginx-secure.conf"
    "docker/postgresql-hardened.conf"
    "src/middlewares/security-headers.ts"
    "src/middlewares/simple-waf.ts"
    "src/lib/env-validator.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Check environment variables
REQUIRED_VARS=(
    "JWT_SECRET"
    "DATABASE_URL"
    "REDIS_PASSWORD"
    "ENCRYPTION_KEY"
    "BACKUP_ENCRYPTION_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ ! -z "${!var}" ]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is not set"
    fi
done

echo "🔍 Security validation complete"
EOF

    chmod +x scripts/validate-security.sh
    echo -e "${GREEN}✅ Validation script created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting FREE security hardening...${NC}"
    
    # Create directories
    mkdir -p docker logs/nginx logs/app logs/postgres logs/redis backups scripts monitoring
    
    # Execute all security hardening steps
    create_ssl_certificates
    create_nginx_config
    create_postgres_config
    create_fail2ban_config
    create_monitoring_config
    create_backup_script
    update_server_security
    create_env_validation
    
    echo ""
    echo -e "${GREEN}🎉 FREE SECURITY HARDENING COMPLETE!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update your .env file with strong secrets"
    echo "2. Run: yarn install"
    echo "3. Run: ./scripts/validate-security.sh"
    echo "4. Deploy: docker-compose -f docker-compose.secure-free.yml up -d"
    echo "5. Test: ./scripts/comprehensive-security-test.sh"
    echo ""
    echo -e "${BLUE}💰 Total cost: FREE (0€/month)${NC}"
    echo -e "${GREEN}🔒 Security level: Enterprise-grade${NC}"
}

# Run main function
main "$@"
EOF
