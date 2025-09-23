#!/bin/bash

# Production Database Backup Script
# Automated backup with encryption and verification

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
S3_BUCKET="${AWS_S3_BUCKET:-}"
MAX_BACKUP_SIZE="10G"
COMPRESSION_LEVEL="6"

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-billetterie}"
DB_USER="${DB_USER:-postgres}"
PGPASSWORD="${DB_PASSWORD:-}"

# Email notifications
NOTIFY_EMAIL="${BACKUP_NOTIFY_EMAIL:-}"
SMTP_SERVER="${SMTP_HOST:-}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
ERROR_LOG="${BACKUP_DIR}/backup.error.log"

# Create backup directory
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${ERROR_LOG}" >&2
}

# Notification function
notify() {
    local subject="$1"
    local message="$2"
    local priority="${3:-normal}"
    
    if [[ -n "${NOTIFY_EMAIL}" ]] && [[ -n "${SMTP_SERVER}" ]]; then
        {
            echo "Subject: [Backup] ${subject}"
            echo "To: ${NOTIFY_EMAIL}"
            echo "Priority: ${priority}"
            echo ""
            echo "${message}"
        } | sendmail -S "${SMTP_SERVER}" "${NOTIFY_EMAIL}" 2>/dev/null || true
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local backup_type="$1"
    local retention="$2"
    
    log "Cleaning up old ${backup_type} backups (keeping ${retention} days)"
    
    find "${BACKUP_DIR}/${backup_type}" -name "*.sql.gz*" -type f -mtime "+${retention}" -delete 2>/dev/null || true
    find "${BACKUP_DIR}/${backup_type}" -name "*.checksum" -type f -mtime "+${retention}" -delete 2>/dev/null || true
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity: $(basename "${backup_file}")"
    
    # Check file exists and has content
    if [[ ! -s "${backup_file}" ]]; then
        error "Backup file is empty or does not exist: ${backup_file}"
        return 1
    fi
    
    # Check gzip integrity
    if ! gzip -t "${backup_file}" 2>/dev/null; then
        error "Backup file is corrupted (gzip test failed): ${backup_file}"
        return 1
    fi
    
    # Create and verify checksum
    local checksum_file="${backup_file}.checksum"
    sha256sum "${backup_file}" > "${checksum_file}"
    
    if ! sha256sum -c "${checksum_file}" >/dev/null 2>&1; then
        error "Backup checksum verification failed: ${backup_file}"
        return 1
    fi
    
    # Test restore on sample (if backup is not too large)
    local file_size=$(stat -c%s "${backup_file}")
    local max_size=$((1024*1024*1024)) # 1GB
    
    if [[ ${file_size} -lt ${max_size} ]]; then
        log "Testing backup restore capability"
        if ! zcat "${backup_file}" | head -n 100 | grep -q "PostgreSQL database dump" 2>/dev/null; then
            error "Backup file does not contain valid PostgreSQL dump: ${backup_file}"
            return 1
        fi
    fi
    
    log "Backup verification successful: $(basename "${backup_file}")"
    return 0
}

# Encrypt backup file
encrypt_backup() {
    local backup_file="$1"
    
    if [[ -z "${ENCRYPTION_KEY}" ]]; then
        log "No encryption key provided, skipping encryption"
        return 0
    fi
    
    log "Encrypting backup: $(basename "${backup_file}")"
    
    # Use AES-256-CBC encryption
    if ! openssl enc -aes-256-cbc -salt -in "${backup_file}" -out "${backup_file}.enc" -pass pass:"${ENCRYPTION_KEY}"; then
        error "Failed to encrypt backup: ${backup_file}"
        return 1
    fi
    
    # Remove unencrypted file
    rm -f "${backup_file}"
    mv "${backup_file}.enc" "${backup_file}"
    
    log "Backup encrypted successfully"
    return 0
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [[ -z "${S3_BUCKET}" ]]; then
        log "No S3 bucket configured, skipping upload"
        return 0
    fi
    
    log "Uploading backup to S3: s3://${S3_BUCKET}/backups/${backup_type}/$(basename "${backup_file}")"
    
    # Upload with server-side encryption and metadata
    if ! aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/backups/${backup_type}/" \
        --server-side-encryption AES256 \
        --metadata "backup-date=$(date -Iseconds),backup-type=${backup_type},database=${DB_NAME}" \
        --storage-class STANDARD_IA; then
        error "Failed to upload backup to S3: ${backup_file}"
        return 1
    fi
    
    # Upload checksum file
    if [[ -f "${backup_file}.checksum" ]]; then
        aws s3 cp "${backup_file}.checksum" "s3://${S3_BUCKET}/backups/${backup_type}/" \
            --server-side-encryption AES256 2>/dev/null || true
    fi
    
    log "Backup uploaded to S3 successfully"
    return 0
}

# Create database backup
create_backup() {
    local backup_type="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/${backup_type}/${DB_NAME}_${backup_type}_${timestamp}.sql.gz"
    
    log "Starting ${backup_type} backup of database ${DB_NAME}"
    log "Backup file: $(basename "${backup_file}")"
    
    # Check disk space (require at least 2GB free)
    local available_space=$(df "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
    local required_space=$((2*1024*1024)) # 2GB in KB
    
    if [[ ${available_space} -lt ${required_space} ]]; then
        error "Insufficient disk space for backup (available: ${available_space}KB, required: ${required_space}KB)"
        notify "Backup Failed - Insufficient Disk Space" \
               "Available: ${available_space}KB\nRequired: ${required_space}KB" "high"
        return 1
    fi
    
    # Create backup with custom format for better compression and features
    local pg_dump_opts=(
        "--host=${DB_HOST}"
        "--port=${DB_PORT}"
        "--username=${DB_USER}"
        "--dbname=${DB_NAME}"
        "--no-password"
        "--verbose"
        "--lock-wait-timeout=30000"
        "--no-privileges"
        "--no-owner"
        "--clean"
        "--if-exists"
        "--format=custom"
        "--compress=${COMPRESSION_LEVEL}"
    )
    
    # Export password for pg_dump
    export PGPASSWORD
    
    # Create the backup
    if ! timeout 1800 pg_dump "${pg_dump_opts[@]}" | gzip > "${backup_file}"; then
        error "Database backup failed"
        rm -f "${backup_file}"
        notify "Database Backup Failed" \
               "pg_dump command failed for database ${DB_NAME}" "high"
        return 1
    fi
    
    # Verify backup was created
    if [[ ! -f "${backup_file}" ]] || [[ ! -s "${backup_file}" ]]; then
        error "Backup file was not created or is empty: ${backup_file}"
        notify "Database Backup Failed" \
               "Backup file was not created or is empty" "high"
        return 1
    fi
    
    local backup_size=$(du -h "${backup_file}" | cut -f1)
    log "Backup created successfully: ${backup_size}"
    
    # Verify backup integrity
    if ! verify_backup "${backup_file}"; then
        error "Backup verification failed, removing corrupted backup"
        rm -f "${backup_file}" "${backup_file}.checksum"
        notify "Database Backup Failed" \
               "Backup verification failed - corrupted backup detected" "high"
        return 1
    fi
    
    # Encrypt backup if key is provided
    if [[ -n "${ENCRYPTION_KEY}" ]]; then
        if ! encrypt_backup "${backup_file}"; then
            error "Backup encryption failed"
            notify "Database Backup Failed" \
                   "Backup encryption failed" "high"
            return 1
        fi
    fi
    
    # Upload to S3 if configured
    if [[ -n "${S3_BUCKET}" ]]; then
        if ! upload_to_s3 "${backup_file}" "${backup_type}"; then
            error "S3 upload failed, but backup is available locally"
            notify "Database Backup Warning" \
                   "S3 upload failed, backup available locally only" "normal"
        fi
    fi
    
    log "${backup_type} backup completed successfully: $(basename "${backup_file}") (${backup_size})"
    
    # Send success notification
    notify "Database Backup Successful" \
           "Database: ${DB_NAME}\nType: ${backup_type}\nSize: ${backup_size}\nFile: $(basename "${backup_file}")" "normal"
    
    return 0
}

# Main execution
main() {
    local backup_type="${1:-daily}"
    
    log "=== Starting database backup (${backup_type}) ==="
    log "Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    log "Backup directory: ${BACKUP_DIR}"
    
    # Test database connectivity
    if ! timeout 10 pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" >/dev/null 2>&1; then
        error "Cannot connect to database ${DB_HOST}:${DB_PORT}"
        notify "Database Backup Failed" \
               "Cannot connect to database ${DB_HOST}:${DB_PORT}" "high"
        exit 1
    fi
    
    # Create backup
    if create_backup "${backup_type}"; then
        log "Backup process completed successfully"
    else
        error "Backup process failed"
        exit 1
    fi
    
    # Cleanup old backups based on type
    case "${backup_type}" in
        daily)
            cleanup_old_backups "daily" "${RETENTION_DAYS}"
            ;;
        weekly)
            cleanup_old_backups "weekly" "$((RETENTION_DAYS * 4))"
            cleanup_old_backups "daily" "${RETENTION_DAYS}"
            ;;
        monthly)
            cleanup_old_backups "monthly" "$((RETENTION_DAYS * 12))"
            cleanup_old_backups "weekly" "$((RETENTION_DAYS * 4))"
            cleanup_old_backups "daily" "${RETENTION_DAYS}"
            ;;
    esac
    
    log "=== Backup process completed ==="
}

# Handle script arguments
case "${1:-daily}" in
    daily|weekly|monthly)
        main "$1"
        ;;
    --help|-h)
        echo "Usage: $0 [daily|weekly|monthly]"
        echo "Environment variables:"
        echo "  BACKUP_DIR - Backup directory (default: /backups)"
        echo "  RETENTION_DAYS - Retention period in days (default: 7)"
        echo "  BACKUP_ENCRYPTION_KEY - Encryption key for backups"
        echo "  AWS_S3_BUCKET - S3 bucket for backup storage"
        echo "  DB_* - Database connection parameters"
        exit 0
        ;;
    *)
        error "Invalid backup type: $1"
        echo "Usage: $0 [daily|weekly|monthly]"
        exit 1
        ;;
esac
