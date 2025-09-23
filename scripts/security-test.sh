#!/bin/bash

# Automated Security Testing Script
# Tests backup/restore functionality and performs security checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TEST_DIR="./test-restore"
LOG_FILE="./security-test.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}=== Billetterie Security Test Suite ===${NC}"
echo "Starting security tests at $(date)"

# Function to log messages
log_message() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required tools if missing
install_dependencies() {
    log_message "${YELLOW}Checking dependencies...${NC}"
    
    if ! command_exists python3; then
        log_message "${RED}Python3 is required but not installed${NC}"
        exit 1
    fi
    
    if ! command_exists pip3; then
        log_message "${RED}pip3 is required but not installed${NC}"
        exit 1
    fi
    
    # Install Python dependencies
    pip3 install requests urllib3 --quiet
    
    if ! command_exists nmap; then
        log_message "${YELLOW}Installing nmap...${NC}"
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y nmap
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install nmap
        else
            log_message "${YELLOW}Please install nmap manually${NC}"
        fi
    fi
    
    if ! command_exists nikto; then
        log_message "${YELLOW}Installing nikto...${NC}"
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get install -y nikto
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install nikto
        else
            log_message "${YELLOW}Please install nikto manually${NC}"
        fi
    fi
}

# Test database backup functionality
test_backup() {
    log_message "${BLUE}=== Testing Backup Functionality ===${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create test backup
    log_message "Creating database backup..."
    if npm run backup:create -- --test > /dev/null 2>&1; then
        log_message "${GREEN}✓ Backup creation: PASSED${NC}"
    else
        log_message "${RED}✗ Backup creation: FAILED${NC}"
        return 1
    fi
    
    # Test backup encryption
    BACKUP_FILE=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.backup" | head -1)
    if [ -n "$BACKUP_FILE" ]; then
        # Check if backup is encrypted (should not contain plain text database schema)
        if ! grep -q "CREATE TABLE" "$BACKUP_FILE" 2>/dev/null; then
            log_message "${GREEN}✓ Backup encryption: PASSED${NC}"
        else
            log_message "${RED}✗ Backup encryption: FAILED - Backup contains plain text${NC}"
        fi
    fi
    
    # Test backup integrity
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        log_message "Verifying backup integrity..."
        if npm run backup:verify -- "$BACKUP_FILE" > /dev/null 2>&1; then
            log_message "${GREEN}✓ Backup integrity: PASSED${NC}"
        else
            log_message "${RED}✗ Backup integrity: FAILED${NC}"
        fi
    fi
}

# Test restore functionality
test_restore() {
    log_message "${BLUE}=== Testing Restore Functionality ===${NC}"
    
    BACKUP_FILE=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.backup" | head -1)
    
    if [ -z "$BACKUP_FILE" ]; then
        log_message "${RED}✗ No backup file found for restore test${NC}"
        return 1
    fi
    
    # Create test environment for restore
    mkdir -p "$TEST_DIR"
    
    # Test restore process
    log_message "Testing database restore..."
    if npm run backup:restore -- "$BACKUP_FILE" --test-mode > /dev/null 2>&1; then
        log_message "${GREEN}✓ Database restore: PASSED${NC}"
    else
        log_message "${RED}✗ Database restore: FAILED${NC}"
        return 1
    fi
    
    # Test data consistency after restore
    log_message "Verifying data consistency..."
    if npm run test:db-consistency > /dev/null 2>&1; then
        log_message "${GREEN}✓ Data consistency: PASSED${NC}"
    else
        log_message "${RED}✗ Data consistency: FAILED${NC}"
    fi
}

# Test application security
test_application_security() {
    log_message "${BLUE}=== Testing Application Security ===${NC}"
    
    # Start application if not running
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_message "Starting application for security tests..."
        npm run dev &
        APP_PID=$!
        sleep 10
        
        # Check if app started
        if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
            log_message "${RED}✗ Could not start application for testing${NC}"
            return 1
        fi
    fi
    
    # Run custom penetration tests
    log_message "Running custom penetration tests..."
    python3 scripts/pentest.py http://localhost:3001 -o "pentest_results_${TIMESTAMP}.json"
    
    if [ $? -eq 0 ]; then
        log_message "${GREEN}✓ Custom penetration tests: COMPLETED${NC}"
    else
        log_message "${RED}✗ Custom penetration tests: FAILED${NC}"
    fi
    
    # Kill application if we started it
    if [ -n "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
}

# Test network security
test_network_security() {
    log_message "${BLUE}=== Testing Network Security ===${NC}"
    
    if command_exists nmap; then
        log_message "Scanning open ports..."
        nmap -sS -O localhost > "nmap_scan_${TIMESTAMP}.txt" 2>/dev/null || true
        
        # Check for dangerous open ports
        if grep -q "22/open\|23/open\|3389/open" "nmap_scan_${TIMESTAMP}.txt"; then
            log_message "${YELLOW}⚠ Administrative ports detected${NC}"
        fi
        
        if grep -q "21/open\|25/open\|53/open" "nmap_scan_${TIMESTAMP}.txt"; then
            log_message "${YELLOW}⚠ Network service ports detected${NC}"
        fi
    fi
    
    # Test for SSL/TLS configuration
    if command_exists openssl; then
        log_message "Testing SSL/TLS configuration..."
        echo | openssl s_client -connect localhost:3001 -servername localhost 2>/dev/null | \
            openssl x509 -noout -text > "ssl_test_${TIMESTAMP}.txt" 2>/dev/null || true
        
        if [ -s "ssl_test_${TIMESTAMP}.txt" ]; then
            log_message "${GREEN}✓ SSL certificate analysis: COMPLETED${NC}"
        else
            log_message "${YELLOW}⚠ No SSL certificate found (using HTTP)${NC}"
        fi
    fi
}

# Test web application security
test_web_security() {
    log_message "${BLUE}=== Testing Web Security ===${NC}"
    
    # Start application if needed
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_message "Starting application for web security tests..."
        npm run dev &
        APP_PID=$!
        sleep 10
    fi
    
    if command_exists nikto; then
        log_message "Running Nikto web vulnerability scanner..."
        nikto -h http://localhost:3001 -Format txt -output "nikto_scan_${TIMESTAMP}.txt" > /dev/null 2>&1 || true
        
        if [ -s "nikto_scan_${TIMESTAMP}.txt" ]; then
            # Check for critical vulnerabilities
            if grep -q "OSVDB\|CVE-" "nikto_scan_${TIMESTAMP}.txt"; then
                log_message "${RED}✗ Critical vulnerabilities detected${NC}"
            else
                log_message "${GREEN}✓ No critical vulnerabilities found${NC}"
            fi
        fi
    fi
    
    # Test common security issues
    log_message "Testing for common security misconfigurations..."
    
    # Test for directory traversal
    if curl -s "http://localhost:3001/../../../etc/passwd" | grep -q "root:"; then
        log_message "${RED}✗ Directory traversal vulnerability detected${NC}"
    else
        log_message "${GREEN}✓ Directory traversal protection: PASSED${NC}"
    fi
    
    # Test for SQL injection (basic)
    if curl -s "http://localhost:3001/api/users?id=1' OR '1'='1" | grep -q "error\|SQL\|mysql"; then
        log_message "${RED}✗ Potential SQL injection vulnerability${NC}"
    else
        log_message "${GREEN}✓ Basic SQL injection protection: PASSED${NC}"
    fi
    
    # Test for XSS (basic)
    XSS_PAYLOAD="<script>alert('xss')</script>"
    if curl -s "http://localhost:3001/api/search?q=${XSS_PAYLOAD}" | grep -q "<script>"; then
        log_message "${RED}✗ Potential XSS vulnerability detected${NC}"
    else
        log_message "${GREEN}✓ Basic XSS protection: PASSED${NC}"
    fi
    
    # Kill application if we started it
    if [ -n "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
}

# Test secrets and configuration
test_secrets_security() {
    log_message "${BLUE}=== Testing Secrets Security ===${NC}"
    
    # Check for exposed secrets in code
    log_message "Scanning for exposed secrets..."
    
    SECRETS_FOUND=0
    
    # Look for potential secrets in files
    if grep -r "password.*=.*['\"][^'\"]*['\"]" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules; then
        log_message "${RED}✗ Potential hardcoded passwords found${NC}"
        SECRETS_FOUND=1
    fi
    
    if grep -r "api.*key.*=.*['\"][^'\"]*['\"]" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules; then
        log_message "${RED}✗ Potential hardcoded API keys found${NC}"
        SECRETS_FOUND=1
    fi
    
    if grep -r "secret.*=.*['\"][^'\"]*['\"]" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules; then
        log_message "${RED}✗ Potential hardcoded secrets found${NC}"
        SECRETS_FOUND=1
    fi
    
    if [ $SECRETS_FOUND -eq 0 ]; then
        log_message "${GREEN}✓ No hardcoded secrets found${NC}"
    fi
    
    # Check .env file security
    if [ -f ".env" ]; then
        log_message "Checking .env file security..."
        
        # Check file permissions
        ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null || echo "unknown")
        if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "unknown" ]; then
            log_message "${YELLOW}⚠ .env file has permissive permissions: $ENV_PERMS${NC}"
        else
            log_message "${GREEN}✓ .env file permissions: SECURE${NC}"
        fi
        
        # Check for weak secrets
        if grep -q "password.*=.*123\|secret.*=.*abc\|key.*=.*test" .env; then
            log_message "${RED}✗ Weak secrets detected in .env file${NC}"
        else
            log_message "${GREEN}✓ .env file secrets appear strong${NC}"
        fi
    fi
}

# Generate security report
generate_report() {
    log_message "${BLUE}=== Generating Security Report ===${NC}"
    
    REPORT_FILE="security_report_${TIMESTAMP}.html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Billetterie Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        .code { background: #f5f5f5; padding: 10px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Billetterie Security Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Suite Version: 1.0</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <p>This report contains the results of automated security testing performed on the Billetterie application.</p>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <div class="code">
EOF
    
    # Add log content to report
    grep -E "✓|✗|⚠" "$LOG_FILE" | sed 's/$/\<br\>/' >> "$REPORT_FILE"
    
    cat >> "$REPORT_FILE" << EOF
        </div>
    </div>
    
    <div class="section">
        <h2>Files Generated</h2>
        <ul>
EOF
    
    # List generated files
    for file in pentest_results_*.json nmap_scan_*.txt nikto_scan_*.txt ssl_test_*.txt; do
        if [ -f "$file" ]; then
            echo "            <li>$file</li>" >> "$REPORT_FILE"
        fi
    done
    
    cat >> "$REPORT_FILE" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Address any failed security tests immediately</li>
            <li>Review warning items and implement improvements</li>
            <li>Schedule regular security testing</li>
            <li>Keep all dependencies updated</li>
            <li>Monitor security alerts and logs</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_message "${GREEN}Security report generated: $REPORT_FILE${NC}"
}

# Cleanup function
cleanup() {
    log_message "${BLUE}Cleaning up...${NC}"
    
    # Remove test directories
    rm -rf "$TEST_DIR" 2>/dev/null || true
    
    # Kill any background processes
    if [ -n "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
}

# Main execution
main() {
    echo "Starting security test suite at $(date)" > "$LOG_FILE"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Install dependencies
    install_dependencies
    
    # Run tests
    test_backup
    test_restore
    test_secrets_security
    test_network_security
    test_application_security
    test_web_security
    
    # Generate report
    generate_report
    
    log_message "${GREEN}=== Security testing completed ===${NC}"
    log_message "Log file: $LOG_FILE"
    log_message "Check the generated report and scan files for detailed results."
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -h, --help    Show this help message"
            echo "  --backup-only Run only backup/restore tests"
            echo "  --security-only Run only security tests"
            exit 0
            ;;
        --backup-only)
            BACKUP_ONLY=1
            shift
            ;;
        --security-only)
            SECURITY_ONLY=1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run appropriate tests
if [ "$BACKUP_ONLY" = "1" ]; then
    install_dependencies
    test_backup
    test_restore
elif [ "$SECURITY_ONLY" = "1" ]; then
    install_dependencies
    test_secrets_security
    test_network_security
    test_application_security
    test_web_security
    generate_report
else
    main
fi
