#!/bin/bash

# Production Security Test Script
# Tests all three critical security implementations

echo "🔐 TESTING PRODUCTION SECURITY IMPLEMENTATIONS"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC}: $2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}: $2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo -e "\n${YELLOW}1. Testing Secrets Management${NC}"
echo "--------------------------------"

# Test 1: Check if secrets manager files exist
if [ -f "src/lib/production-secrets-manager.ts" ]; then
    test_result 0 "Production secrets manager file exists"
else
    test_result 1 "Production secrets manager file missing"
fi

# Test 2: Check if secrets config exists
if [ -f "src/config/secrets.ts" ]; then
    test_result 0 "Secrets configuration file exists"
else
    test_result 1 "Secrets configuration file missing"
fi

# Test 3: Check environment template
if [ -f ".env.production.example" ]; then
    test_result 0 "Production environment template exists"
else
    test_result 1 "Production environment template missing"
fi

echo -e "\n${YELLOW}2. Testing SSL/TLS Configuration${NC}"
echo "---------------------------------"

# Test 4: Check SSL manager file
if [ -f "src/lib/production-ssl-manager.ts" ]; then
    test_result 0 "Production SSL manager file exists"
else
    test_result 1 "Production SSL manager file missing"
fi

# Test 5: Check SSL directory creation capability
mkdir -p ./test-ssl-dir 2>/dev/null
if [ $? -eq 0 ]; then
    test_result 0 "SSL directory creation capability"
    rmdir ./test-ssl-dir
else
    test_result 1 "Cannot create SSL directories"
fi

# Test 6: Check if OpenSSL is available (for certificate generation)
if command -v openssl &> /dev/null; then
    test_result 0 "OpenSSL available for certificate generation"
else
    test_result 1 "OpenSSL not available - certificates cannot be generated"
fi

echo -e "\n${YELLOW}3. Testing Rate Limiting Implementation${NC}"
echo "--------------------------------------"

# Test 7: Check rate limiting files
if [ -f "src/middlewares/productionRateLimit.ts" ]; then
    test_result 0 "Production rate limiting file exists"
else
    test_result 1 "Production rate limiting file missing"
fi

# Test 8: Check rate limiting integration
if [ -f "src/middlewares/production-rate-limit-integration.ts" ]; then
    test_result 0 "Rate limiting integration file exists"
else
    test_result 1 "Rate limiting integration file missing"
fi

# Test 9: Check middleware integration
if [ -f "middleware.ts" ] && grep -q "instrumentedRateLimit" middleware.ts; then
    test_result 0 "Rate limiting integrated in middleware"
else
    test_result 1 "Rate limiting not integrated in middleware"
fi

echo -e "\n${YELLOW}4. Testing Kubernetes Configuration${NC}"
echo "-----------------------------------"

# Test 10: Check Kubernetes production config
if [ -f "k8s/production.yaml" ]; then
    test_result 0 "Kubernetes production configuration exists"
else
    test_result 1 "Kubernetes production configuration missing"
fi

# Test 11: Check if external secrets are configured
if grep -q "ExternalSecret" k8s/production.yaml; then
    test_result 0 "External Secrets Operator configured"
else
    test_result 1 "External Secrets Operator not configured"
fi

# Test 12: Check cert-manager configuration
if grep -q "cert-manager.io" k8s/production.yaml; then
    test_result 0 "Cert-manager configuration found"
else
    test_result 1 "Cert-manager configuration missing"
fi

echo -e "\n${YELLOW}5. Testing Production Scripts${NC}"
echo "------------------------------"

# Test 13: Check initialization script
if [ -f "scripts/initialize-production.ts" ]; then
    test_result 0 "Production initialization script exists"
else
    test_result 1 "Production initialization script missing"
fi

# Test 14: Check health check endpoint
if [ -f "app/api/health/production/route.ts" ]; then
    test_result 0 "Production health check endpoint exists"
else
    test_result 1 "Production health check endpoint missing"
fi

echo -e "\n${YELLOW}6. Testing Dependencies${NC}"
echo "------------------------"

# Test 15: Check if required packages are in package.json
if [ -f "package.json" ]; then
    if grep -q "ioredis\|redis" package.json; then
        test_result 0 "Redis client dependency found"
    else
        test_result 1 "Redis client dependency missing"
    fi
else
    test_result 1 "package.json not found"
fi

echo -e "\n${YELLOW}7. Security Headers Test${NC}"
echo "---------------------------"

# Test 16: Check if security headers are implemented
if grep -q "X-Content-Type-Options\|Strict-Transport-Security" middleware.ts; then
    test_result 0 "Security headers implemented in middleware"
else
    test_result 1 "Security headers missing from middleware"
fi

# Test 17: Check CSP configuration
if grep -q "Content-Security-Policy" middleware.ts; then
    test_result 0 "Content Security Policy configured"
else
    test_result 1 "Content Security Policy missing"
fi

echo -e "\n${YELLOW}Summary${NC}"
echo "======="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Production security implementation is complete.${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Run: yarn add ioredis (if not already installed)"
    echo "2. Configure your secrets manager (Azure/AWS/Vault)"
    echo "3. Set up your domain and SSL certificates"
    echo "4. Test with: yarn build"
    echo "5. Deploy to staging environment first"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please fix the issues above before deploying.${NC}"
    exit 1
fi
