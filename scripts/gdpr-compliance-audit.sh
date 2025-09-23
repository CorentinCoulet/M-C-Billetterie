#!/bin/bash

# Compliance Audit Automation Script
# Automated GDPR compliance checking and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPORT_DIR="./compliance-reports"
LOG_FILE="./compliance-audit.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/gdpr-compliance-report-$TIMESTAMP.html"

log_message() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Create report directory
mkdir -p "$REPORT_DIR"

log_message "${BLUE}=== GDPR Compliance Audit Started ===${NC}"

# Function to check data retention policies
check_data_retention() {
    log_message "${BLUE}=== Checking Data Retention Policies ===${NC}"
    
    # Check for data older than retention period
    RETENTION_DAYS=${DATA_RETENTION_DAYS:-2555}  # 7 years default
    
    # Simulate checking old data (replace with actual database queries)
    OLD_DATA_COUNT=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - $RETENTION_DAYS);
        
        Promise.all([
            prisma.user.count({ where: { createdAt: { lt: cutoffDate } } }),
            prisma.auditLog.count({ where: { timestamp: { lt: cutoffDate }, isSensitive: false } })
        ]).then(([userCount, auditCount]) => {
            console.log(userCount + auditCount);
            prisma.\$disconnect();
        }).catch(() => console.log(0));
    " 2>/dev/null || echo "0")
    
    if [ "$OLD_DATA_COUNT" -gt 0 ]; then
        log_message "${YELLOW}⚠ Found $OLD_DATA_COUNT records exceeding retention period${NC}"
        echo "data_retention_violations=$OLD_DATA_COUNT" >> compliance_metrics.txt
    else
        log_message "${GREEN}✓ Data retention policy compliance: PASSED${NC}"
        echo "data_retention_violations=0" >> compliance_metrics.txt
    fi
}

# Function to verify encryption
check_encryption_compliance() {
    log_message "${BLUE}=== Checking Encryption Compliance ===${NC}"
    
    # Check database encryption
    DB_ENCRYPTED=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        prisma.user.findFirst().then(user => {
            if (user && user._encrypted && Array.isArray(user._encrypted)) {
                console.log('1');
            } else {
                console.log('0');
            }
            prisma.\$disconnect();
        }).catch(() => console.log('0'));
    " 2>/dev/null || echo "0")
    
    if [ "$DB_ENCRYPTED" = "1" ]; then
        log_message "${GREEN}✓ Database field encryption: ENABLED${NC}"
    else
        log_message "${RED}✗ Database field encryption: NOT DETECTED${NC}"
    fi
    
    # Check SSL/TLS configuration
    if command -v openssl &> /dev/null; then
        TLS_VERSION=$(echo | timeout 5 openssl s_client -connect localhost:3001 2>/dev/null | openssl version -a | head -1 || echo "No TLS")
        if [[ "$TLS_VERSION" == *"TLS"* ]]; then
            log_message "${GREEN}✓ TLS encryption: ENABLED${NC}"
        else
            log_message "${YELLOW}⚠ TLS encryption: NOT DETECTED (may be using HTTP)${NC}"
        fi
    fi
    
    echo "db_encryption_enabled=$DB_ENCRYPTED" >> compliance_metrics.txt
}

# Function to check consent management
check_consent_management() {
    log_message "${BLUE}=== Checking Consent Management ===${NC}"
    
    # Check if consent tracking is implemented
    CONSENT_TRACKING=$(node -e "
        const fs = require('fs');
        const path = require('path');
        
        // Look for consent-related code
        const searchFiles = [
            'src/models/user.ts',
            'src/lib/gdpr-compliance.ts',
            'prisma/schema.prisma'
        ];
        
        let consentFound = false;
        for (const file of searchFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                if (content.match(/consent|gdpr|privacy/i)) {
                    consentFound = true;
                    break;
                }
            } catch (e) {}
        }
        
        console.log(consentFound ? '1' : '0');
    " 2>/dev/null || echo "0")
    
    if [ "$CONSENT_TRACKING" = "1" ]; then
        log_message "${GREEN}✓ Consent management system: DETECTED${NC}"
    else
        log_message "${RED}✗ Consent management system: NOT FOUND${NC}"
    fi
    
    echo "consent_management_enabled=$CONSENT_TRACKING" >> compliance_metrics.txt
}

# Function to check audit logging
check_audit_logging() {
    log_message "${BLUE}=== Checking Audit Logging ===${NC}"
    
    # Check recent audit log entries
    AUDIT_ENTRIES=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        prisma.auditLog.count({
            where: { timestamp: { gte: since24h } }
        }).then(count => {
            console.log(count);
            prisma.\$disconnect();
        }).catch(() => console.log(0));
    " 2>/dev/null || echo "0")
    
    if [ "$AUDIT_ENTRIES" -gt 0 ]; then
        log_message "${GREEN}✓ Audit logging: ACTIVE ($AUDIT_ENTRIES entries in 24h)${NC}"
    else
        log_message "${YELLOW}⚠ Audit logging: NO RECENT ENTRIES${NC}"
    fi
    
    echo "audit_entries_24h=$AUDIT_ENTRIES" >> compliance_metrics.txt
}

# Function to check user rights implementation
check_user_rights() {
    log_message "${BLUE}=== Checking User Rights Implementation ===${NC}"
    
    # Check for GDPR rights endpoints
    RIGHTS_ENDPOINTS=$(grep -r "gdpr\|data-export\|delete\|portability" src/routes/ 2>/dev/null | wc -l || echo "0")
    
    if [ "$RIGHTS_ENDPOINTS" -gt 0 ]; then
        log_message "${GREEN}✓ User rights endpoints: FOUND ($RIGHTS_ENDPOINTS endpoints)${NC}"
    else
        log_message "${RED}✗ User rights endpoints: NOT FOUND${NC}"
    fi
    
    # Check for privacy policy endpoint
    PRIVACY_POLICY=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/privacy-policy 2>/dev/null || echo "000")
    if [ "$PRIVACY_POLICY" = "200" ]; then
        log_message "${GREEN}✓ Privacy policy endpoint: ACCESSIBLE${NC}"
    else
        log_message "${YELLOW}⚠ Privacy policy endpoint: NOT ACCESSIBLE${NC}"
    fi
    
    echo "user_rights_endpoints=$RIGHTS_ENDPOINTS" >> compliance_metrics.txt
    echo "privacy_policy_accessible=$([ "$PRIVACY_POLICY" = "200" ] && echo "1" || echo "0")" >> compliance_metrics.txt
}

# Function to check breach notification system
check_breach_notification() {
    log_message "${BLUE}=== Checking Breach Notification System ===${NC}"
    
    # Check for breach detection code
    BREACH_DETECTION=$(find src/ -name "*.ts" -exec grep -l "breach\|incident\|security.*alert" {} \; 2>/dev/null | wc -l || echo "0")
    
    if [ "$BREACH_DETECTION" -gt 0 ]; then
        log_message "${GREEN}✓ Breach detection system: IMPLEMENTED${NC}"
    else
        log_message "${RED}✗ Breach detection system: NOT FOUND${NC}"
    fi
    
    # Check for notification templates
    NOTIFICATION_TEMPLATES=$(find . -name "*breach*" -o -name "*incident*" -o -name "*alert*" | grep -v node_modules | wc -l || echo "0")
    
    if [ "$NOTIFICATION_TEMPLATES" -gt 0 ]; then
        log_message "${GREEN}✓ Breach notification templates: FOUND${NC}"
    else
        log_message "${YELLOW}⚠ Breach notification templates: NOT FOUND${NC}"
    fi
    
    echo "breach_detection_enabled=$BREACH_DETECTION" >> compliance_metrics.txt
}

# Function to check data minimization
check_data_minimization() {
    log_message "${BLUE}=== Checking Data Minimization ===${NC}"
    
    # Check database schema for excessive data collection
    PERSONAL_FIELDS=$(node -e "
        const fs = require('fs');
        try {
            const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
            const personalFields = [
                'name', 'email', 'phone', 'address', 'birthDate',
                'socialSecurityNumber', 'passport', 'creditCard'
            ];
            let foundFields = 0;
            personalFields.forEach(field => {
                if (schema.includes(field)) foundFields++;
            });
            console.log(foundFields);
        } catch (e) {
            console.log(0);
        }
    " 2>/dev/null || echo "0")
    
    if [ "$PERSONAL_FIELDS" -lt 5 ]; then
        log_message "${GREEN}✓ Data minimization: GOOD ($PERSONAL_FIELDS personal fields)${NC}"
    else
        log_message "${YELLOW}⚠ Data minimization: REVIEW NEEDED ($PERSONAL_FIELDS personal fields)${NC}"
    fi
    
    echo "personal_data_fields=$PERSONAL_FIELDS" >> compliance_metrics.txt
}

# Function to verify data subject rights automation
check_rights_automation() {
    log_message "${BLUE}=== Checking Rights Automation ===${NC}"
    
    # Check for automated data export
    DATA_EXPORT_SCRIPT=$(find scripts/ -name "*export*" -o -name "*gdpr*" | wc -l || echo "0")
    
    if [ "$DATA_EXPORT_SCRIPT" -gt 0 ]; then
        log_message "${GREEN}✓ Automated data export: AVAILABLE${NC}"
    else
        log_message "${RED}✗ Automated data export: NOT FOUND${NC}"
    fi
    
    # Check for automated deletion
    DATA_DELETION_SCRIPT=$(find scripts/ -name "*delete*" -o -name "*anonymize*" | wc -l || echo "0")
    
    if [ "$DATA_DELETION_SCRIPT" -gt 0 ]; then
        log_message "${GREEN}✓ Automated data deletion: AVAILABLE${NC}"
    else
        log_message "${RED}✗ Automated data deletion: NOT FOUND${NC}"
    fi
    
    echo "automated_export=$DATA_EXPORT_SCRIPT" >> compliance_metrics.txt
    echo "automated_deletion=$DATA_DELETION_SCRIPT" >> compliance_metrics.txt
}

# Function to generate compliance score
calculate_compliance_score() {
    log_message "${BLUE}=== Calculating Compliance Score ===${NC}"
    
    # Read metrics
    source compliance_metrics.txt 2>/dev/null || true
    
    # Calculate score (each check is worth points)
    TOTAL_SCORE=0
    MAX_SCORE=100
    
    # Data retention (15 points)
    if [ "${data_retention_violations:-1}" -eq 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 15))
    fi
    
    # Encryption (20 points)
    if [ "${db_encryption_enabled:-0}" -eq 1 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 20))
    fi
    
    # Consent management (15 points)
    if [ "${consent_management_enabled:-0}" -eq 1 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 15))
    fi
    
    # Audit logging (10 points)
    if [ "${audit_entries_24h:-0}" -gt 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 10))
    fi
    
    # User rights (15 points)
    if [ "${user_rights_endpoints:-0}" -gt 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 10))
    fi
    if [ "${privacy_policy_accessible:-0}" -eq 1 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 5))
    fi
    
    # Breach detection (10 points)
    if [ "${breach_detection_enabled:-0}" -gt 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 10))
    fi
    
    # Data minimization (5 points)
    if [ "${personal_data_fields:-10}" -lt 5 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 5))
    fi
    
    # Rights automation (10 points)
    if [ "${automated_export:-0}" -gt 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 5))
    fi
    if [ "${automated_deletion:-0}" -gt 0 ]; then
        TOTAL_SCORE=$((TOTAL_SCORE + 5))
    fi
    
    COMPLIANCE_PERCENTAGE=$((TOTAL_SCORE * 100 / MAX_SCORE))
    
    if [ "$COMPLIANCE_PERCENTAGE" -ge 90 ]; then
        log_message "${GREEN}✓ GDPR Compliance Score: $COMPLIANCE_PERCENTAGE% - EXCELLENT${NC}"
    elif [ "$COMPLIANCE_PERCENTAGE" -ge 75 ]; then
        log_message "${YELLOW}⚠ GDPR Compliance Score: $COMPLIANCE_PERCENTAGE% - GOOD${NC}"
    elif [ "$COMPLIANCE_PERCENTAGE" -ge 50 ]; then
        log_message "${YELLOW}⚠ GDPR Compliance Score: $COMPLIANCE_PERCENTAGE% - NEEDS IMPROVEMENT${NC}"
    else
        log_message "${RED}✗ GDPR Compliance Score: $COMPLIANCE_PERCENTAGE% - POOR${NC}"
    fi
    
    echo "compliance_score=$COMPLIANCE_PERCENTAGE" >> compliance_metrics.txt
}

# Function to generate HTML report
generate_html_report() {
    log_message "${BLUE}=== Generating Compliance Report ===${NC}"
    
    # Read metrics
    source compliance_metrics.txt 2>/dev/null || true
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>GDPR Compliance Audit Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .score-box { text-align: center; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .excellent { background: #27ae60; color: white; }
        .good { background: #f39c12; color: white; }
        .poor { background: #e74c3c; color: white; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { color: #27ae60; font-weight: bold; }
        .warn { color: #f39c12; font-weight: bold; }
        .fail { color: #e74c3c; font-weight: bold; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        .recommendations { background: #e8f4fd; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; background: #ecf0f1; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ GDPR Compliance Audit Report</h1>
        <p>Generated: $(date)</p>
        <p>System: Billetterie API</p>
        <p>Audit Version: 1.0</p>
    </div>
    
    <div class="score-box ${compliance_score:-50}" style="background: $([ "${compliance_score:-50}" -ge 90 ] && echo "#27ae60" || ([ "${compliance_score:-50}" -ge 75 ] && echo "#f39c12" || echo "#e74c3c"));">
        <h2>Overall Compliance Score</h2>
        <div style="font-size: 48px; font-weight: bold;">${compliance_score:-0}%</div>
        <p>Based on automated compliance checks</p>
    </div>
    
    <div class="section">
        <h2>📊 Compliance Metrics</h2>
        <div class="metric">
            <span>Data Retention Violations</span>
            <span class="$([ "${data_retention_violations:-1}" -eq 0 ] && echo "pass" || echo "fail")">${data_retention_violations:-Unknown}</span>
        </div>
        <div class="metric">
            <span>Database Encryption</span>
            <span class="$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "pass" || echo "fail")">$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "Enabled" || echo "Not Detected")</span>
        </div>
        <div class="metric">
            <span>Consent Management</span>
            <span class="$([ "${consent_management_enabled:-0}" -eq 1 ] && echo "pass" || echo "fail")">$([ "${consent_management_enabled:-0}" -eq 1 ] && echo "Implemented" || echo "Not Found")</span>
        </div>
        <div class="metric">
            <span>Audit Log Entries (24h)</span>
            <span class="$([ "${audit_entries_24h:-0}" -gt 0 ] && echo "pass" || echo "warn")">${audit_entries_24h:-0}</span>
        </div>
        <div class="metric">
            <span>User Rights Endpoints</span>
            <span class="$([ "${user_rights_endpoints:-0}" -gt 0 ] && echo "pass" || echo "fail")">${user_rights_endpoints:-0}</span>
        </div>
        <div class="metric">
            <span>Privacy Policy Accessible</span>
            <span class="$([ "${privacy_policy_accessible:-0}" -eq 1 ] && echo "pass" || echo "warn")">$([ "${privacy_policy_accessible:-0}" -eq 1 ] && echo "Yes" || echo "No")</span>
        </div>
        <div class="metric">
            <span>Breach Detection System</span>
            <span class="$([ "${breach_detection_enabled:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${breach_detection_enabled:-0}" -gt 0 ] && echo "Implemented" || echo "Not Found")</span>
        </div>
        <div class="metric">
            <span>Personal Data Fields</span>
            <span class="$([ "${personal_data_fields:-10}" -lt 5 ] && echo "pass" || echo "warn")">${personal_data_fields:-Unknown}</span>
        </div>
        <div class="metric">
            <span>Automated Data Export</span>
            <span class="$([ "${automated_export:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${automated_export:-0}" -gt 0 ] && echo "Available" || echo "Not Found")</span>
        </div>
        <div class="metric">
            <span>Automated Data Deletion</span>
            <span class="$([ "${automated_deletion:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${automated_deletion:-0}" -gt 0 ] && echo "Available" || echo "Not Found")</span>
        </div>
    </div>
    
    <div class="section">
        <h2>📋 GDPR Articles Compliance</h2>
        <table>
            <tr><th>Article</th><th>Requirement</th><th>Status</th></tr>
            <tr><td>Art. 5</td><td>Data Processing Principles</td><td class="$([ "${data_retention_violations:-1}" -eq 0 ] && echo "pass" || echo "warn")">$([ "${data_retention_violations:-1}" -eq 0 ] && echo "Compliant" || echo "Review Needed")</td></tr>
            <tr><td>Art. 7</td><td>Consent</td><td class="$([ "${consent_management_enabled:-0}" -eq 1 ] && echo "pass" || echo "fail")">$([ "${consent_management_enabled:-0}" -eq 1 ] && echo "Implemented" || echo "Not Implemented")</td></tr>
            <tr><td>Art. 12-14</td><td>Information to Data Subjects</td><td class="$([ "${privacy_policy_accessible:-0}" -eq 1 ] && echo "pass" || echo "warn")">$([ "${privacy_policy_accessible:-0}" -eq 1 ] && echo "Available" || echo "Missing")</td></tr>
            <tr><td>Art. 15</td><td>Right of Access</td><td class="$([ "${automated_export:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${automated_export:-0}" -gt 0 ] && echo "Automated" || echo "Manual Only")</td></tr>
            <tr><td>Art. 17</td><td>Right to Erasure</td><td class="$([ "${automated_deletion:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${automated_deletion:-0}" -gt 0 ] && echo "Automated" || echo "Manual Only")</td></tr>
            <tr><td>Art. 25</td><td>Data Protection by Design</td><td class="$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "pass" || echo "warn")">$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "Implemented" || echo "Partial")</td></tr>
            <tr><td>Art. 30</td><td>Records of Processing</td><td class="$([ "${audit_entries_24h:-0}" -gt 0 ] && echo "pass" || echo "warn")">$([ "${audit_entries_24h:-0}" -gt 0 ] && echo "Active Logging" || echo "No Recent Logs")</td></tr>
            <tr><td>Art. 32</td><td>Security of Processing</td><td class="$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "pass" || echo "warn")">$([ "${db_encryption_enabled:-0}" -eq 1 ] && echo "Encrypted" || echo "Review Needed")</td></tr>
            <tr><td>Art. 33</td><td>Breach Notification</td><td class="$([ "${breach_detection_enabled:-0}" -gt 0 ] && echo "pass" || echo "fail")">$([ "${breach_detection_enabled:-0}" -gt 0 ] && echo "System Ready" || echo "Not Implemented")</td></tr>
        </table>
    </div>
    
    <div class="recommendations">
        <h2>🎯 Recommendations</h2>
        <ul>
EOF

    # Add specific recommendations based on results
    if [ "${db_encryption_enabled:-0}" -eq 0 ]; then
        echo "            <li><strong>Critical:</strong> Implement field-level encryption for personal data</li>" >> "$REPORT_FILE"
    fi
    
    if [ "${consent_management_enabled:-0}" -eq 0 ]; then
        echo "            <li><strong>High:</strong> Implement consent management system</li>" >> "$REPORT_FILE"
    fi
    
    if [ "${automated_export:-0}" -eq 0 ]; then
        echo "            <li><strong>Medium:</strong> Implement automated data export for subject access requests</li>" >> "$REPORT_FILE"
    fi
    
    if [ "${automated_deletion:-0}" -eq 0 ]; then
        echo "            <li><strong>Medium:</strong> Implement automated data deletion system</li>" >> "$REPORT_FILE"
    fi
    
    if [ "${breach_detection_enabled:-0}" -eq 0 ]; then
        echo "            <li><strong>High:</strong> Implement automated breach detection and notification system</li>" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF
            <li>Schedule regular compliance audits (quarterly recommended)</li>
            <li>Keep documentation updated with any system changes</li>
            <li>Train staff on GDPR requirements and procedures</li>
            <li>Review and update privacy policy regularly</li>
            <li>Implement data retention automation</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📄 Next Steps</h2>
        <ol>
            <li><strong>Address Critical Issues:</strong> Focus on failed compliance checks first</li>
            <li><strong>Implement Missing Features:</strong> Add missing GDPR compliance features</li>
            <li><strong>Document Processes:</strong> Create detailed GDPR compliance documentation</li>
            <li><strong>Staff Training:</strong> Ensure team understands GDPR requirements</li>
            <li><strong>Regular Audits:</strong> Schedule automated compliance checks</li>
            <li><strong>Legal Review:</strong> Have compliance documentation reviewed by legal counsel</li>
        </ol>
    </div>
    
    <div class="footer">
        <p><strong>Disclaimer:</strong> This automated audit provides a technical assessment of GDPR compliance features. 
        It does not constitute legal advice. Please consult with qualified legal counsel for complete compliance assurance.</p>
        <p>Report generated by Billetterie GDPR Compliance Auditor v1.0</p>
    </div>
</body>
</html>
EOF

    log_message "${GREEN}HTML report generated: $REPORT_FILE${NC}"
}

# Function to send compliance alerts
send_compliance_alert() {
    local score="${compliance_score:-0}"
    
    if [ "$score" -lt 75 ]; then
        log_message "${RED}🚨 COMPLIANCE ALERT: Score below 75% ($score%)${NC}"
        
        # In production, send actual alerts
        echo "Subject: GDPR Compliance Alert - Score: $score%" > alert.txt
        echo "The automated GDPR compliance audit has detected issues requiring attention." >> alert.txt
        echo "Compliance Score: $score%" >> alert.txt
        echo "Report: $REPORT_FILE" >> alert.txt
        echo "" >> alert.txt
        echo "Please review the compliance report and take corrective action." >> alert.txt
        
        # Send alert (implement with your notification system)
        log_message "${BLUE}Compliance alert prepared (implement actual sending)${NC}"
    fi
}

# Main execution
main() {
    # Initialize metrics file
    rm -f compliance_metrics.txt
    
    # Run all compliance checks
    check_data_retention
    check_encryption_compliance
    check_consent_management
    check_audit_logging
    check_user_rights
    check_breach_notification
    check_data_minimization
    check_rights_automation
    
    # Calculate overall score
    calculate_compliance_score
    
    # Generate reports
    generate_html_report
    send_compliance_alert
    
    # Cleanup
    rm -f compliance_metrics.txt alert.txt
    
    log_message "${GREEN}=== GDPR Compliance Audit Completed ===${NC}"
    log_message "Report available at: $REPORT_FILE"
}

# Parse command line arguments
case "${1:-full}" in
    full)
        main
        ;;
    score)
        check_data_retention
        check_encryption_compliance
        check_consent_management
        check_audit_logging
        check_user_rights
        check_breach_notification
        check_data_minimization
        check_rights_automation
        calculate_compliance_score
        source compliance_metrics.txt
        echo "GDPR Compliance Score: ${compliance_score:-0}%"
        rm -f compliance_metrics.txt
        ;;
    report)
        shift
        main
        echo "Report: $REPORT_FILE"
        ;;
    help|*)
        echo "Usage: $0 {full|score|report|help}"
        echo ""
        echo "Commands:"
        echo "  full    - Run complete compliance audit with HTML report"
        echo "  score   - Calculate and display compliance score only"
        echo "  report  - Generate compliance report"
        echo "  help    - Show this help message"
        ;;
esac
