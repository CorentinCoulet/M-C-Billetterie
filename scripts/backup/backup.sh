#!/bin/bash

# Billetterie Backup Script with 3-2-1 Strategy
# This script implements:
# - 3 copies of data (original + 2 backups)
# - 2 different storage media types
# - 1 offsite backup (AWS S3)

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
LOCAL_BACKUP_DIR="$BACKUP_DIR/local"
TEMP_DIR="$BACKUP_DIR/temp"
LOG_FILE="$BACKUP_DIR/logs/backup_${BACKUP_DATE}.log"

# Database configuration
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-billetterie}"
DB_USER="${DB_USER:-postgres}"

# AWS S3 configuration
S3_BUCKET="${AWS_S3_BUCKET:-billetterie-backups}"
S3_REGION="${AWS_REGION:-eu-west-3}"

# Encryption configuration
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
if [ -z "$ENCRYPTION_KEY" ]; then
    echo "ERROR: BACKUP_ENCRYPTION_KEY environment variable is required"
    exit 1
fi

# Retention policy (days)
LOCAL_RETENTION_DAYS=30
S3_RETENTION_DAYS=2555  # 7 years for compliance

# Create directories
mkdir -p "$LOCAL_BACKUP_DIR" "$TEMP_DIR" "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"/*
}

# Trap for cleanup on exit
trap cleanup EXIT

# Check required tools
check_dependencies() {
    local deps=("pg_dump" "gpg" "aws" "openssl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error_exit "$dep is not installed"
        fi
    done
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local dump_file="$TEMP_DIR/database_${BACKUP_DATE}.sql"
    local compressed_file="${dump_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    # Create database dump
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=custom \
        --file="$dump_file" || error_exit "Database dump failed"
    
    # Compress the dump
    gzip "$dump_file" || error_exit "Compression failed"
    
    # Encrypt the compressed dump
    gpg --batch --yes --cipher-algo AES256 \
        --compress-algo 2 \
        --symmetric \
        --passphrase "$ENCRYPTION_KEY" \
        --output "$encrypted_file" \
        "$compressed_file" || error_exit "Encryption failed"
    
    # Calculate checksum
    local checksum_file="${encrypted_file}.sha256"
    sha256sum "$encrypted_file" > "$checksum_file"
    
    log "Database backup completed: $(basename "$encrypted_file")"
    
    # Move to local backup directory
    mv "$encrypted_file" "$LOCAL_BACKUP_DIR/"
    mv "$checksum_file" "$LOCAL_BACKUP_DIR/"
    
    rm -f "$compressed_file"
}

# Application files backup
backup_application_files() {
    log "Starting application files backup..."
    
    local app_backup_file="$TEMP_DIR/app_files_${BACKUP_DATE}.tar.gz"
    local encrypted_app_file="${app_backup_file}.gpg"
    
    # Define directories to backup
    local backup_dirs=(
        "/app/uploads"
        "/app/logs"
        "/app/ssl"
        "/app/config"
    )
    
    # Create tar archive of application files
    tar -czf "$app_backup_file" \
        --exclude="*.log" \
        --exclude="node_modules" \
        --exclude="*.tmp" \
        "${backup_dirs[@]}" 2>/dev/null || log "Some application directories may not exist"
    
    # Encrypt the archive
    if [ -f "$app_backup_file" ]; then
        gpg --batch --yes --cipher-algo AES256 \
            --compress-algo 2 \
            --symmetric \
            --passphrase "$ENCRYPTION_KEY" \
            --output "$encrypted_app_file" \
            "$app_backup_file" || error_exit "App files encryption failed"
        
        # Calculate checksum
        local checksum_file="${encrypted_app_file}.sha256"
        sha256sum "$encrypted_app_file" > "$checksum_file"
        
        # Move to local backup directory
        mv "$encrypted_app_file" "$LOCAL_BACKUP_DIR/"
        mv "$checksum_file" "$LOCAL_BACKUP_DIR/"
        
        rm -f "$app_backup_file"
        log "Application files backup completed"
    else
        log "No application files to backup"
    fi
}

# Upload to S3 (offsite backup)
upload_to_s3() {
    log "Starting S3 upload..."
    
    local backup_files
    backup_files=$(find "$LOCAL_BACKUP_DIR" -name "*${BACKUP_DATE}*" -type f)
    
    for file in $backup_files; do
        local s3_key="backups/$(date +%Y)/$(date +%m)/$(basename "$file")"
        
        aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA \
            --metadata "backup-date=$BACKUP_DATE,retention-days=$S3_RETENTION_DAYS" \
            || error_exit "S3 upload failed for $file"
        
        log "Uploaded to S3: $s3_key"
    done
    
    # Set lifecycle policy for automatic deletion
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$S3_BUCKET" \
        --region "$S3_REGION" \
        --lifecycle-configuration file:///tmp/s3-lifecycle.json 2>/dev/null || true
}

# Cleanup old local backups
cleanup_old_backups() {
    log "Cleaning up old local backups (older than $LOCAL_RETENTION_DAYS days)..."
    
    find "$LOCAL_BACKUP_DIR" -type f -mtime +$LOCAL_RETENTION_DAYS -delete
    
    local removed_count
    removed_count=$(find "$LOCAL_BACKUP_DIR" -type f -mtime +$LOCAL_RETENTION_DAYS | wc -l)
    log "Removed $removed_count old backup files"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    local backup_files
    backup_files=$(find "$LOCAL_BACKUP_DIR" -name "*${BACKUP_DATE}*.gpg" -type f)
    
    for file in $backup_files; do
        local checksum_file="${file}.sha256"
        
        if [ -f "$checksum_file" ]; then
            if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
                log "✓ Integrity verified: $(basename "$file")"
            else
                error_exit "Integrity check failed: $(basename "$file")"
            fi
        else
            error_exit "Checksum file not found: $(basename "$checksum_file")"
        fi
    done
}

# Test backup restoration (randomly test 1% of backups)
test_restoration() {
    if [ $((RANDOM % 100)) -eq 0 ]; then
        log "Performing random restoration test..."
        
        # Select a random backup file for testing
        local test_file
        test_file=$(find "$LOCAL_BACKUP_DIR" -name "database_*.sql.gz.gpg" -type f | shuf -n 1)
        
        if [ -n "$test_file" ]; then
            local test_dir="$TEMP_DIR/restoration_test"
            mkdir -p "$test_dir"
            
            # Decrypt and test
            gpg --batch --yes --decrypt \
                --passphrase "$ENCRYPTION_KEY" \
                --output "$test_dir/test.sql.gz" \
                "$test_file" 2>/dev/null || error_exit "Test decryption failed"
            
            # Verify it's a valid gzip file
            if gzip -t "$test_dir/test.sql.gz" 2>/dev/null; then
                log "✓ Restoration test passed"
            else
                error_exit "Restoration test failed - invalid backup file"
            fi
            
            rm -rf "$test_dir"
        else
            log "No backup files found for restoration test"
        fi
    fi
}

# Create S3 lifecycle configuration
create_s3_lifecycle_config() {
    cat > /tmp/s3-lifecycle.json << EOF
{
    "Rules": [
        {
            "ID": "BackupRetentionRule",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "backups/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": $S3_RETENTION_DAYS
            }
        }
    ]
}
EOF
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # In production, integrate with your notification system
    # (Slack, email, SMS, etc.)
    log "NOTIFICATION [$status]: $message"
    
    # Example: Send to webhook
    # curl -X POST "$WEBHOOK_URL" \
    #      -H "Content-Type: application/json" \
    #      -d "{\"text\":\"Backup $status: $message\"}"
}

# Main backup process
main() {
    local start_time
    start_time=$(date +%s)
    
    log "=== Starting backup process ==="
    log "Backup date: $BACKUP_DATE"
    
    check_dependencies
    create_s3_lifecycle_config
    
    # Perform backups
    backup_database
    backup_application_files
    
    # Verify integrity
    verify_backup
    
    # Upload to offsite storage
    upload_to_s3
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Random restoration test
    test_restoration
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "=== Backup completed successfully in ${duration}s ==="
    
    # Calculate backup size
    local backup_size
    backup_size=$(du -sh "$LOCAL_BACKUP_DIR" | cut -f1)
    
    send_notification "SUCCESS" "Backup completed in ${duration}s, size: $backup_size"
}

# Run main function
main "$@"
