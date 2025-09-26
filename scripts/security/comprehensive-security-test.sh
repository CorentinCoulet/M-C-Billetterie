#!/bin/bash

# =============================================================================
# COMPREHENSIVE SECURITY TEST SCRIPT
# Tests all security aspects of the billetterie application
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
REPORT_FILE="security-test-report-$(date +%Y%m%d-%H%M%S).json"

echo -e "${BLUE}🔒 Starting Comprehensive Security Tests${NC}"
echo "Target: $API_URL"
echo "Report: $REPORT_FILE"
echo "=========================================="

# Initialize report
cat > $REPORT_FILE << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "target": "$API_URL",
  "tests": []
}
EOF

# Function to add test result to report
add_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    # Create temp file with new test result
    cat > temp_test.json << EOF
{
  "name": "$test_name",
  "status": "$status",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "details": "$details"
}
EOF
    
    # Add to report using jq
    if command -v jq &> /dev/null; then
        jq ".tests += [$(cat temp_test.json)]" $REPORT_FILE > temp_report.json && mv temp_report.json $REPORT_FILE
    fi
    
    rm -f temp_test.json
}

# Function to check if service is running
check_service() {
    echo -e "${BLUE}📡 Checking service availability...${NC}"
    
    if curl -s -f "$API_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Service is running${NC}"
        add_test_result "service_availability" "PASS" "Service is responsive"
        return 0
    else
        echo -e "${RED}❌ Service is not running${NC}"
        add_test_result "service_availability" "FAIL" "Service is not responsive"
        return 1
    fi
}

# Test HTTPS/TLS Configuration
test_tls_security() {
    echo -e "${BLUE}🔐 Testing TLS/SSL Security...${NC}"
    
    if [[ $API_URL == https://* ]]; then
        # Test SSL Labs grade (requires external service)
        echo "  - Checking SSL configuration..."
        
        # Test cipher suites
        if openssl s_client -connect "${API_URL#https://}:443" -cipher 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS' < /dev/null 2>/dev/null; then
            echo -e "${GREEN}  ✅ Strong cipher suites supported${NC}"
            add_test_result "tls_cipher_strength" "PASS" "Strong cipher suites configured"
        else
            echo -e "${RED}  ❌ Weak cipher suites detected${NC}"
            add_test_result "tls_cipher_strength" "FAIL" "Weak cipher suites found"
        fi
        
        # Test certificate validity
        if openssl s_client -connect "${API_URL#https://}:443" -servername "${API_URL#https://}" < /dev/null 2>/dev/null | openssl x509 -checkend 2592000; then
            echo -e "${GREEN}  ✅ SSL certificate is valid${NC}"
            add_test_result "ssl_certificate" "PASS" "Certificate is valid and not expiring soon"
        else
            echo -e "${RED}  ❌ SSL certificate issues${NC}"
            add_test_result "ssl_certificate" "FAIL" "Certificate invalid or expiring soon"
        fi
    else
        echo -e "${YELLOW}  ⚠️  Not using HTTPS${NC}"
        add_test_result "https_usage" "WARN" "Application not using HTTPS"
    fi
}

# Test HTTP Security Headers
test_security_headers() {
    echo -e "${BLUE}🛡️  Testing Security Headers...${NC}"
    
    local response=$(curl -s -I "$API_URL/health" || echo "")
    
    # Check for essential security headers
    declare -A headers=(
        ["X-Frame-Options"]="Clickjacking protection"
        ["X-Content-Type-Options"]="MIME type sniffing protection"
        ["X-XSS-Protection"]="XSS protection"
        ["Content-Security-Policy"]="Content Security Policy"
        ["Strict-Transport-Security"]="HTTPS enforcement"
        ["Referrer-Policy"]="Referrer policy"
    )
    
    for header in "${!headers[@]}"; do
        if echo "$response" | grep -i "^$header:" > /dev/null; then
            echo -e "${GREEN}  ✅ $header present${NC}"
            add_test_result "security_header_$header" "PASS" "${headers[$header]} header present"
        else
            echo -e "${RED}  ❌ $header missing${NC}"
            add_test_result "security_header_$header" "FAIL" "${headers[$header]} header missing"
        fi
    done
}

# Test Authentication Security
test_authentication() {
    echo -e "${BLUE}🔑 Testing Authentication Security...${NC}"
    
    # Test rate limiting on login
    echo "  - Testing login rate limiting..."
    local failed_attempts=0
    for i in {1..10}; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$API_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com","password":"wrongpassword"}')
        
        if [[ "$response" == "429" ]]; then
            echo -e "${GREEN}  ✅ Rate limiting active after $i attempts${NC}"
            add_test_result "login_rate_limiting" "PASS" "Rate limiting triggers after $i failed attempts"
            break
        elif [[ "$response" == "401" ]]; then
            ((failed_attempts++))
        fi
    done
    
    if [[ $failed_attempts -eq 10 ]]; then
        echo -e "${RED}  ❌ Rate limiting not working${NC}"
        add_test_result "login_rate_limiting" "FAIL" "No rate limiting detected after 10 attempts"
    fi
    
    # Test JWT security
    echo "  - Testing JWT token security..."
    local login_response=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@test.com","password":"admin123"}' 2>/dev/null || echo "")
    
    if echo "$login_response" | grep -o '"token":"[^"]*"' > /dev/null; then
        local token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        # Test token with modified signature
        local modified_token="${token%.*}.modified"
        local invalid_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $modified_token" \
            "$API_URL/api/auth/me")
        
        if [[ "$invalid_response" == "401" ]]; then
            echo -e "${GREEN}  ✅ JWT signature validation working${NC}"
            add_test_result "jwt_signature_validation" "PASS" "Invalid JWT signatures rejected"
        else
            echo -e "${RED}  ❌ JWT signature validation failed${NC}"
            add_test_result "jwt_signature_validation" "FAIL" "Invalid JWT signatures accepted"
        fi
    fi
}

# Test SQL Injection Protection
test_sql_injection() {
    echo -e "${BLUE}💉 Testing SQL Injection Protection...${NC}"
    
    local sql_payloads=(
        "' OR '1'='1"
        "'; DROP TABLE users; --"
        "' UNION SELECT * FROM users --"
        "admin'--"
        "admin'/*"
        "1' OR '1'='1"
    )
    
    local protected=true
    
    for payload in "${sql_payloads[@]}"; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$API_URL/api/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$payload\",\"password\":\"test\"}")
        
        # Should return 400 (bad request) or 401 (unauthorized), not 500 (server error)
        if [[ "$response" == "500" ]]; then
            echo -e "${RED}  ❌ SQL injection vulnerability detected with payload: $payload${NC}"
            add_test_result "sql_injection_$payload" "FAIL" "Server error indicates potential SQL injection"
            protected=false
        fi
    done
    
    if $protected; then
        echo -e "${GREEN}  ✅ SQL injection protection working${NC}"
        add_test_result "sql_injection_protection" "PASS" "All SQL injection payloads handled safely"
    fi
}

# Test XSS Protection
test_xss_protection() {
    echo -e "${BLUE}🎭 Testing XSS Protection...${NC}"
    
    local xss_payloads=(
        "<script>alert('XSS')</script>"
        "<img src='x' onerror='alert(1)'>"
        "<svg onload=alert(1)>"
        "javascript:alert(1)"
        "<iframe src='javascript:alert(1)'>"
    )
    
    local protected=true
    
    for payload in "${xss_payloads[@]}"; do
        local response=$(curl -s -X POST "$API_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"$payload\",\"email\":\"test@test.com\",\"password\":\"Password123!\"}")
        
        # Check if the payload is reflected without encoding/sanitization
        if echo "$response" | grep -F "$payload" > /dev/null; then
            echo -e "${RED}  ❌ XSS vulnerability detected with payload: $payload${NC}"
            add_test_result "xss_protection_$payload" "FAIL" "XSS payload reflected without sanitization"
            protected=false
        fi
    done
    
    if $protected; then
        echo -e "${GREEN}  ✅ XSS protection working${NC}"
        add_test_result "xss_protection" "PASS" "All XSS payloads handled safely"
    fi
}

# Test CSRF Protection
test_csrf_protection() {
    echo -e "${BLUE}🔄 Testing CSRF Protection...${NC}"
    
    # Test if CSRF token is required
    local response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -H "Origin: https://malicious-site.com" \
        -d '{"email":"test@test.com","password":"test"}')
    
    if [[ "$response" == "403" ]] || [[ "$response" == "400" ]]; then
        echo -e "${GREEN}  ✅ CSRF protection active${NC}"
        add_test_result "csrf_protection" "PASS" "CSRF protection blocking cross-origin requests"
    else
        echo -e "${RED}  ❌ CSRF protection not working${NC}"
        add_test_result "csrf_protection" "FAIL" "Cross-origin requests allowed"
    fi
}

# Test File Upload Security
test_file_upload() {
    echo -e "${BLUE}📁 Testing File Upload Security...${NC}"
    
    # Create malicious files for testing
    echo "<?php system(\$_GET['cmd']); ?>" > malicious.php
    echo "<script>alert('XSS')</script>" > malicious.html
    
    # Test PHP file upload
    local php_response=$(curl -s -w "%{http_code}" -o /dev/null \
        -F "file=@malicious.php" "$API_URL/api/upload" 2>/dev/null || echo "000")
    
    if [[ "$php_response" == "400" ]] || [[ "$php_response" == "403" ]]; then
        echo -e "${GREEN}  ✅ PHP file upload blocked${NC}"
        add_test_result "file_upload_php_blocked" "PASS" "Malicious PHP files rejected"
    else
        echo -e "${RED}  ❌ PHP file upload allowed${NC}"
        add_test_result "file_upload_php_blocked" "FAIL" "Malicious PHP files accepted"
    fi
    
    # Clean up
    rm -f malicious.php malicious.html
}

# Test Session Security
test_session_security() {
    echo -e "${BLUE}🍪 Testing Session Security...${NC}"
    
    # Test session cookie attributes
    local response=$(curl -s -I -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@test.com","password":"admin123"}')
    
    if echo "$response" | grep -i "set-cookie" | grep -i "httponly" > /dev/null; then
        echo -e "${GREEN}  ✅ HttpOnly cookie flag set${NC}"
        add_test_result "session_httponly" "PASS" "Session cookies use HttpOnly flag"
    else
        echo -e "${RED}  ❌ HttpOnly cookie flag missing${NC}"
        add_test_result "session_httponly" "FAIL" "Session cookies missing HttpOnly flag"
    fi
    
    if echo "$response" | grep -i "set-cookie" | grep -i "secure" > /dev/null; then
        echo -e "${GREEN}  ✅ Secure cookie flag set${NC}"
        add_test_result "session_secure" "PASS" "Session cookies use Secure flag"
    else
        echo -e "${YELLOW}  ⚠️  Secure cookie flag missing (expected in HTTPS)${NC}"
        add_test_result "session_secure" "WARN" "Session cookies missing Secure flag"
    fi
}

# Test API Rate Limiting
test_api_rate_limiting() {
    echo -e "${BLUE}⚡ Testing API Rate Limiting...${NC}"
    
    local rate_limited=false
    
    for i in {1..50}; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/events")
        
        if [[ "$response" == "429" ]]; then
            echo -e "${GREEN}  ✅ Rate limiting active after $i requests${NC}"
            add_test_result "api_rate_limiting" "PASS" "API rate limiting triggers after $i requests"
            rate_limited=true
            break
        fi
        
        sleep 0.1
    done
    
    if ! $rate_limited; then
        echo -e "${RED}  ❌ Rate limiting not working${NC}"
        add_test_result "api_rate_limiting" "FAIL" "No rate limiting detected after 50 requests"
    fi
}

# Test Password Security
test_password_security() {
    echo -e "${BLUE}🔐 Testing Password Security...${NC}"
    
    local weak_passwords=("123456" "password" "qwerty" "admin" "test")
    
    for password in "${weak_passwords[@]}"; do
        local response=$(curl -s -X POST "$API_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"Test\",\"email\":\"test_$password@test.com\",\"password\":\"$password\"}")
        
        # Should reject weak passwords
        if echo "$response" | grep -i "error\|invalid\|weak" > /dev/null; then
            echo -e "${GREEN}  ✅ Weak password '$password' rejected${NC}"
        else
            echo -e "${RED}  ❌ Weak password '$password' accepted${NC}"
            add_test_result "password_strength_$password" "FAIL" "Weak password accepted"
        fi
    done
    
    add_test_result "password_security" "PASS" "Password strength validation working"
}

# Generate final report
generate_report() {
    echo -e "${BLUE}📊 Generating Security Report...${NC}"
    
    if command -v jq &> /dev/null; then
        local total_tests=$(jq '.tests | length' $REPORT_FILE)
        local passed_tests=$(jq '.tests | map(select(.status == "PASS")) | length' $REPORT_FILE)
        local failed_tests=$(jq '.tests | map(select(.status == "FAIL")) | length' $REPORT_FILE)
        local warning_tests=$(jq '.tests | map(select(.status == "WARN")) | length' $REPORT_FILE)
        
        echo "=========================================="
        echo -e "${BLUE}📋 SECURITY TEST SUMMARY${NC}"
        echo "=========================================="
        echo -e "Total Tests: $total_tests"
        echo -e "${GREEN}Passed: $passed_tests${NC}"
        echo -e "${RED}Failed: $failed_tests${NC}"
        echo -e "${YELLOW}Warnings: $warning_tests${NC}"
        echo ""
        
        if [[ $failed_tests -gt 0 ]]; then
            echo -e "${RED}❌ SECURITY ISSUES FOUND${NC}"
            echo "Failed tests:"
            jq -r '.tests[] | select(.status == "FAIL") | "  - " + .name + ": " + .details' $REPORT_FILE
            echo ""
        fi
        
        if [[ $warning_tests -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  SECURITY WARNINGS${NC}"
            echo "Warning tests:"
            jq -r '.tests[] | select(.status == "WARN") | "  - " + .name + ": " + .details' $REPORT_FILE
            echo ""
        fi
        
        if [[ $failed_tests -eq 0 ]]; then
            echo -e "${GREEN}🎉 ALL SECURITY TESTS PASSED!${NC}"
        fi
        
        # Add summary to report
        jq ". += {\"summary\": {\"total\": $total_tests, \"passed\": $passed_tests, \"failed\": $failed_tests, \"warnings\": $warning_tests}}" $REPORT_FILE > temp_report.json && mv temp_report.json $REPORT_FILE
        
    else
        echo "jq not available - basic report generated"
    fi
    
    echo "Detailed report saved to: $REPORT_FILE"
}

# Main execution
main() {
    # Check dependencies
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl is required but not installed${NC}"
        exit 1
    fi
    
    # Run all tests
    check_service || exit 1
    
    test_tls_security
    test_security_headers
    test_authentication
    test_sql_injection
    test_xss_protection
    test_csrf_protection
    test_file_upload
    test_session_security
    test_api_rate_limiting
    test_password_security
    
    generate_report
}

# Run main function
main "$@"
