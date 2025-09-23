#!/bin/bash

# SSL Certificate Automation with Let's Encrypt
# Automated certificate renewal and deployment

set -e

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
BACKUP_DIR="/opt/ssl-backups"
NGINX_CONFIG="/etc/nginx/sites-available/billetterie"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root"
fi

# Install certbot if not present
install_certbot() {
    log "Checking for certbot installation..."
    
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        if [[ -f /etc/debian_version ]]; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        elif [[ -f /etc/redhat-release ]]; then
            yum install -y certbot python3-certbot-nginx
        else
            error "Unsupported OS for automatic certbot installation"
        fi
    else
        log "Certbot already installed"
    fi
}

# Generate initial certificate
generate_certificate() {
    log "Generating SSL certificate for $DOMAIN..."
    
    # Stop nginx temporarily
    systemctl stop nginx || warn "Nginx not running"
    
    # Generate certificate
    certbot certonly \
        --standalone \
        --agree-tos \
        --no-eff-email \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "api.$DOMAIN" \
        --non-interactive
    
    if [ $? -eq 0 ]; then
        log "Certificate generated successfully"
    else
        error "Failed to generate certificate"
    fi
}

# Configure nginx with SSL
configure_nginx() {
    log "Configuring nginx with SSL..."
    
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_trusted_certificate $CERT_DIR/chain.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-ancestors 'none';" always;
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
EOF
    
    # Test nginx configuration
    nginx -t && systemctl reload nginx
    log "Nginx configuration updated"
}

# Setup auto-renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /etc/cron.d/certbot-renewal << EOF
# Renew certificates twice daily
0 */12 * * * root /usr/bin/certbot renew --quiet --post-hook "/bin/systemctl reload nginx"
EOF
    
    # Test renewal
    certbot renew --dry-run
    
    if [ $? -eq 0 ]; then
        log "Auto-renewal setup successful"
    else
        warn "Auto-renewal test failed"
    fi
}

# Backup certificates
backup_certificates() {
    log "Creating certificate backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/ssl-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    tar -czf "$BACKUP_FILE" -C /etc/letsencrypt .
    
    # Encrypt backup
    if command -v gpg &> /dev/null; then
        gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE"
        rm "$BACKUP_FILE"
        log "Encrypted backup created: $BACKUP_FILE.gpg"
    else
        log "Backup created: $BACKUP_FILE"
    fi
    
    # Clean old backups (keep last 10)
    find "$BACKUP_DIR" -name "ssl-backup-*.tar.gz*" -type f | sort -r | tail -n +11 | xargs rm -f
}

# Monitor certificate expiry
monitor_expiry() {
    log "Setting up certificate expiry monitoring..."
    
    cat > /usr/local/bin/ssl-monitor.sh << 'EOF'
#!/bin/bash

DOMAIN="$1"
DAYS_WARN=30
EMAIL="admin@$DOMAIN"

# Get certificate expiry date
EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $DAYS_WARN ]; then
    echo "WARNING: SSL certificate for $DOMAIN expires in $DAYS_LEFT days"
    # Send alert (configure with your alerting system)
fi
EOF
    
    chmod +x /usr/local/bin/ssl-monitor.sh
    
    # Add to crontab
    echo "0 9 * * * root /usr/local/bin/ssl-monitor.sh $DOMAIN" >> /etc/cron.d/ssl-monitor
}

# Main execution
main() {
    log "Starting SSL automation for $DOMAIN"
    
    install_certbot
    
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        generate_certificate
    else
        log "Certificate already exists for $DOMAIN"
    fi
    
    configure_nginx
    setup_auto_renewal
    backup_certificates
    monitor_expiry
    
    log "SSL automation completed successfully"
    log "Certificate will auto-renew every 12 hours"
    log "Backups are stored in $BACKUP_DIR"
}

# Parse arguments
case "${1:-help}" in
    install)
        shift
        main "$@"
        ;;
    renew)
        certbot renew --force-renewal
        systemctl reload nginx
        ;;
    backup)
        backup_certificates
        ;;
    monitor)
        /usr/local/bin/ssl-monitor.sh "$2"
        ;;
    help|*)
        echo "Usage: $0 {install|renew|backup|monitor} [domain] [email]"
        echo ""
        echo "Commands:"
        echo "  install DOMAIN EMAIL  - Install SSL certificates and setup automation"
        echo "  renew                 - Force certificate renewal"
        echo "  backup                - Create certificate backup"
        echo "  monitor DOMAIN        - Check certificate expiry"
        echo ""
        echo "Examples:"
        echo "  $0 install tickets.company.com admin@company.com"
        echo "  $0 renew"
        echo "  $0 monitor tickets.company.com"
        ;;
esac
