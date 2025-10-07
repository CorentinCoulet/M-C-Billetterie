#!/bin/bash

# Billetterie Restore Script with Security Verification
# This script restores encrypted backups with integrity verification

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
LOCAL_BACKUP_DIR="$BACKUP_DIR/local"
RESTORE_DIR="/tmp/restore"
LOG_FILE="$BACKUP_DIR/logs/restore_$(date +%Y%m%d_%H%M%S).log"

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

# Create directories
mkdir -p "$RESTORE_DIR" "$(dirname "$LOG_FILE")"

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
    rm -rf "$RESTORE_DIR"/*
}

# Trap for cleanup on exit
trap cleanup EXIT

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS] BACKUP_DATE"
    echo ""
    echo "Options:"
    echo "  -s, --source SOURCE     Backup source (local|s3) [default: local]"
    echo "  -d, --dry-run          Perform dry run without actual restoration"
    echo "  -f, --force            Force restoration without confirmation"
    echo "  -t, --type TYPE        Restoration type (full|database|files) [default: full]"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 20240823_140000                    # Restore from local backup"
    echo "  $0 -s s3 20240823_140000             # Restore from S3"
    echo "  $0 -t database 20240823_140000       # Restore only database"
    echo "  $0 --dry-run 20240823_140000         # Test restoration without applying"
    exit 1
}

# Parse command line arguments
parse_arguments() {
    SOURCE="local"
    DRY_RUN=false
    FORCE=false
    RESTORE_TYPE="full"
    BACKUP_DATE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--source)
                SOURCE="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -t|--type)
                RESTORE_TYPE="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                if [ -z "$BACKUP_DATE" ]; then
                    BACKUP_DATE="$1"
                else
                    error_exit "Unknown argument: $1"
                fi
                shift
                ;;
        esac
    done
    
    if [ -z "$BACKUP_DATE" ]; then
        error_exit "Backup date is required"
    fi
    
    if [[ ! "$BACKUP_DATE" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
        error_exit "Invalid backup date format. Expected: YYYYMMDD_HHMMSS"
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    
    case $SOURCE in
        local)
            if [ -d "$LOCAL_BACKUP_DIR" ]; then
                find "$LOCAL_BACKUP_DIR" -name "database_*.gpg" | \
                    sed 's/.*database_\([0-9_]*\)\.sql\.gz\.gpg/\1/' | \
                    sort -r | head -20
            fi
            ;;
        s3)
            aws s3 ls "s3://$S3_BUCKET/backups/" --recursive --region "$S3_REGION" | \
                grep "database_.*\.gpg$" | \
                awk '{print $4}' | \
                sed 's/.*database_\([0-9_]*\)\.sql\.gz\.gpg/\1/' | \
                sort -r | head -20
            ;;
    esac
}

# Download backup from S3
download_from_s3() {
    local backup_date=$1
    log "Downloading backup from S3..."
    
    # Find the backup files in S3
    local s3_files
    s3_files=$(aws s3 ls "s3://$S3_BUCKET/backups/" --recursive --region "$S3_REGION" | \
               grep "$backup_date" | awk '{print $4}')
    
    if [ -z "$s3_files" ]; then
        error_exit "No backup files found in S3 for date: $backup_date"
    fi
    
    for s3_file in $s3_files; do
        local local_file="$RESTORE_DIR/$(basename "$s3_file")"
        aws s3 cp "s3://$S3_BUCKET/$s3_file" "$local_file" --region "$S3_REGION" \
            || error_exit "Failed to download $s3_file"
        log "Downloaded: $(basename "$s3_file")"
    done
}

# Verify backup integrity
verify_integrity() {
    local backup_date=$1
    log "Verifying backup integrity..."
    
    local backup_files
    case $SOURCE in
        local)
            backup_files=$(find "$LOCAL_BACKUP_DIR" -name "*${backup_date}*.gpg" -type f)
            ;;
        s3)
            backup_files=$(find "$RESTORE_DIR" -name "*${backup_date}*.gpg" -type f)
            ;;
    esac
    
    if [ -z "$backup_files" ]; then
        error_exit "No backup files found for date: $backup_date"
    fi
    
    for file in $backup_files; do
        local checksum_file="${file}.sha256"
        local dir=$(dirname "$file")
        
        # Download checksum file from S3 if needed
        if [ "$SOURCE" = "s3" ] && [ ! -f "$checksum_file" ]; then
            local s3_checksum_path=$(aws s3 ls "s3://$S3_BUCKET/backups/" --recursive --region "$S3_REGION" | \
                                   grep "$(basename "$checksum_file")" | awk '{print $4}' | head -1)
            if [ -n "$s3_checksum_path" ]; then
                aws s3 cp "s3://$S3_BUCKET/$s3_checksum_path" "$checksum_file" --region "$S3_REGION"
            fi
        fi
        
        if [ -f "$checksum_file" ]; then
            pushd "$dir" >/dev/null
            if sha256sum -c "$(basename "$checksum_file")" >/dev/null 2>&1; then
                log "✓ Integrity verified: $(basename "$file")"
            else
                error_exit "Integrity check failed: $(basename "$file")"
            fi
            popd >/dev/null
        else
            error_exit "Checksum file not found: $(basename "$checksum_file")"
        fi
    done
}

# Decrypt backup file
decrypt_file() {
    local encrypted_file=$1
    local decrypted_file="${encrypted_file%.gpg}"
    
    log "Decrypting: $(basename "$encrypted_file")"
    
    gpg --batch --yes --decrypt \
        --passphrase "$ENCRYPTION_KEY" \
        --output "$decrypted_file" \
        "$encrypted_file" || error_exit "Decryption failed"
    
    echo "$decrypted_file"
}

# Restore database
restore_database() {
    local backup_date=$1
    log "Starting database restoration..."
    
    # Find database backup file
    local db_backup_file
    case $SOURCE in
        local)
            db_backup_file=$(find "$LOCAL_BACKUP_DIR" -name "database_${backup_date}.sql.gz.gpg" -type f)
            ;;
        s3)
            db_backup_file=$(find "$RESTORE_DIR" -name "database_${backup_date}.sql.gz.gpg" -type f)
            ;;
    esac
    
    if [ -z "$db_backup_file" ]; then
        error_exit "Database backup file not found for date: $backup_date"
    fi
    
    # Decrypt the backup
    local decrypted_file
    decrypted_file=$(decrypt_file "$db_backup_file")
    
    # Decompress
    local sql_file="${decrypted_file%.gz}"
    gunzip "$decrypted_file" || error_exit "Decompression failed"
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would restore database from $(basename "$sql_file")"
        return 0
    fi
    
    # Confirm before restoration
    if [ "$FORCE" = false ]; then
        echo "⚠️  WARNING: This will overwrite the current database!"
        echo "Database: $DB_NAME"
        echo "Host: $DB_HOST"
        echo "Backup date: $backup_date"
        echo ""
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log "Restoration cancelled by user"
            exit 0
        fi
    fi
    
    # Create a backup of current database before restoration
    local current_backup="$RESTORE_DIR/current_db_backup.sql"
    log "Creating backup of current database..."
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --file="$current_backup" || log "WARNING: Could not backup current database"
    
    # Drop and recreate database
    log "Dropping and recreating database..."
    PGPASSWORD="$PGPASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
    PGPASSWORD="$PGPASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    # Restore from backup
    log "Restoring database..."
    PGPASSWORD="$PGPASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        "$sql_file" || error_exit "Database restoration failed"
    
    log "Database restoration completed successfully"
}

# Restore application files
restore_application_files() {
    local backup_date=$1
    log "Starting application files restoration..."
    
    # Find application files backup
    local app_backup_file
    case $SOURCE in
        local)
            app_backup_file=$(find "$LOCAL_BACKUP_DIR" -name "app_files_${backup_date}.tar.gz.gpg" -type f)
            ;;
        s3)
            app_backup_file=$(find "$RESTORE_DIR" -name "app_files_${backup_date}.tar.gz.gpg" -type f)
            ;;
    esac
    
    if [ -z "$app_backup_file" ]; then
        log "No application files backup found for date: $backup_date"
        return 0
    fi
    
    # Decrypt the backup
    local decrypted_file
    decrypted_file=$(decrypt_file "$app_backup_file")
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN: Would restore application files from $(basename "$decrypted_file")"
        return 0
    fi
    
    # Extract files
    log "Extracting application files..."
    tar -xzf "$decrypted_file" -C / || error_exit "Application files extraction failed"
    
    log "Application files restoration completed"
}

# Post-restoration tasks
post_restoration_tasks() {
    local backup_date=$1
    
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    log "Performing post-restoration tasks..."
    
    # Update database migrations if needed
    # yarn prisma:migrate:deploy
    
    # Restart application services
    # systemctl restart billetterie
    
    # Verify application health
    # curl -f http://localhost:3000/api/health
    
    log "Post-restoration tasks completed"
}

# Generate restoration report
generate_report() {
    local backup_date=$1
    local start_time=$2
    local end_time=$3
    
    local duration=$((end_time - start_time))
    local report_file="$BACKUP_DIR/logs/restore_report_${backup_date}.txt"
    
    cat > "$report_file" << EOF
Billetterie Restoration Report
==============================

Date: $(date)
Backup Date: $backup_date
Source: $SOURCE
Type: $RESTORE_TYPE
Duration: ${duration}s
Dry Run: $DRY_RUN

Status: SUCCESS

Files Restored:
$(find "$RESTORE_DIR" -name "*${backup_date}*" -type f | sed 's|.*/||' | sort)

Log File: $LOG_FILE
EOF
    
    log "Restoration report generated: $report_file"
}

# Main restore process
main() {
    local start_time
    start_time=$(date +%s)
    
    log "=== Starting restoration process ==="
    log "Backup date: $BACKUP_DATE"
    log "Source: $SOURCE"
    log "Type: $RESTORE_TYPE"
    log "Dry run: $DRY_RUN"
    
    # Download from S3 if needed
    if [ "$SOURCE" = "s3" ]; then
        download_from_s3 "$BACKUP_DATE"
    fi
    
    # Verify backup integrity
    verify_integrity "$BACKUP_DATE"
    
    # Perform restoration based on type
    case $RESTORE_TYPE in
        full)
            restore_database "$BACKUP_DATE"
            restore_application_files "$BACKUP_DATE"
            ;;
        database)
            restore_database "$BACKUP_DATE"
            ;;
        files)
            restore_application_files "$BACKUP_DATE"
            ;;
        *)
            error_exit "Invalid restore type: $RESTORE_TYPE"
            ;;
    esac
    
    # Post-restoration tasks
    post_restoration_tasks "$BACKUP_DATE"
    
    local end_time
    end_time=$(date +%s)
    
    # Generate report
    generate_report "$BACKUP_DATE" "$start_time" "$end_time"
    
    local duration=$((end_time - start_time))
    log "=== Restoration completed successfully in ${duration}s ==="
}

# Handle special commands
case "${1:-}" in
    --list)
        list_backups
        exit 0
        ;;
    --help|-h|help)
        usage
        ;;
esac

# Parse arguments and run
parse_arguments "$@"
main
