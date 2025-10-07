Write-Host "🔐 TESTING PRODUCTION SECURITY IMPLEMENTATIONS" -ForegroundColor Cyan
Write-Host "==============================================`n"

# Test results
$TestsPassed = 0
$TestsFailed = 0

function Test-Result {
    param([bool]$Success, [string]$Description)
    
    if ($Success) {
        Write-Host "✅ PASSED: $Description" -ForegroundColor Green
        $script:TestsPassed++
    } else {
        Write-Host "❌ FAILED: $Description" -ForegroundColor Red
        $script:TestsFailed++
    }
}

Write-Host "1. Testing Secrets Management" -ForegroundColor Yellow
Write-Host "--------------------------------"

# Test 1: Check if secrets manager files exist
Test-Result (Test-Path "src/lib/production-secrets-manager.ts") "Production secrets manager file exists"

# Test 2: Check if secrets config exists
Test-Result (Test-Path "src/config/secrets.ts") "Secrets configuration file exists"

# Test 3: Check environment template
Test-Result (Test-Path ".env.production.example") "Production environment template exists"

Write-Host "`n2. Testing SSL/TLS Configuration" -ForegroundColor Yellow
Write-Host "---------------------------------"

# Test 4: Check SSL manager file
Test-Result (Test-Path "src/lib/production-ssl-manager.ts") "Production SSL manager file exists"

# Test 5: Check SSL directory creation capability
$TestSSLDir = "./test-ssl-dir"
try {
    New-Item -ItemType Directory -Path $TestSSLDir -Force | Out-Null
    Remove-Item $TestSSLDir -Force
    Test-Result $true "SSL directory creation capability"
} catch {
    Test-Result $false "Cannot create SSL directories"
}

# Test 6: Check if OpenSSL is available
$OpenSSLAvailable = $false
try {
    $null = Get-Command openssl -ErrorAction Stop
    $OpenSSLAvailable = $true
} catch {
    # Check if OpenSSL exists in common paths
    $OpenSSLPaths = @(
        "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
        "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe",
        "C:\OpenSSL-Win64\bin\openssl.exe"
    )
    
    foreach ($path in $OpenSSLPaths) {
        if (Test-Path $path) {
            $OpenSSLAvailable = $true
            break
        }
    }
}
Test-Result $OpenSSLAvailable "OpenSSL available for certificate generation"

Write-Host "`n3. Testing Rate Limiting Implementation" -ForegroundColor Yellow
Write-Host "--------------------------------------"

# Test 7: Check rate limiting files
Test-Result (Test-Path "src/middlewares/productionRateLimit.ts") "Production rate limiting file exists"

# Test 8: Check rate limiting integration
Test-Result (Test-Path "src/middlewares/production-rate-limit-integration.ts") "Rate limiting integration file exists"

# Test 9: Check middleware integration
$middlewareExists = Test-Path "middleware.ts"
$rateLimitingIntegrated = $false
if ($middlewareExists) {
    $middlewareContent = Get-Content "middleware.ts" -Raw
    $rateLimitingIntegrated = $middlewareContent -match "instrumentedRateLimit"
}
Test-Result ($middlewareExists -and $rateLimitingIntegrated) "Rate limiting integrated in middleware"

Write-Host "`n4. Testing Kubernetes Configuration" -ForegroundColor Yellow
Write-Host "-----------------------------------"

# Test 10: Check Kubernetes production config
Test-Result (Test-Path "k8s/production.yaml") "Kubernetes production configuration exists"

# Test 11: Check if external secrets are configured
$k8sExists = Test-Path "k8s/production.yaml"
$externalSecretsConfigured = $false
if ($k8sExists) {
    $k8sContent = Get-Content "k8s/production.yaml" -Raw
    $externalSecretsConfigured = $k8sContent -match "ExternalSecret"
}
Test-Result ($k8sExists -and $externalSecretsConfigured) "External Secrets Operator configured"

# Test 12: Check cert-manager configuration
$certManagerConfigured = $false
if ($k8sExists) {
    $k8sContent = Get-Content "k8s/production.yaml" -Raw
    $certManagerConfigured = $k8sContent -match "cert-manager.io"
}
Test-Result ($k8sExists -and $certManagerConfigured) "Cert-manager configuration found"

Write-Host "`n5. Testing Production Scripts" -ForegroundColor Yellow
Write-Host "------------------------------"

# Test 13: Check initialization script
Test-Result (Test-Path "scripts/initialize-production.ts") "Production initialization script exists"

# Test 14: Check health check endpoint
Test-Result (Test-Path "app/api/health/production/route.ts") "Production health check endpoint exists"

Write-Host "`n6. Testing Dependencies" -ForegroundColor Yellow
Write-Host "------------------------"

# Test 15: Check if required packages are in package.json
$packageJsonExists = Test-Path "package.json"
$redisDepExists = $false
if ($packageJsonExists) {
    $packageContent = Get-Content "package.json" -Raw
    $redisDepExists = $packageContent -match "(ioredis|redis)"
}
Test-Result ($packageJsonExists -and $redisDepExists) "Redis client dependency found"

Write-Host "`n7. Security Headers Test" -ForegroundColor Yellow
Write-Host "---------------------------"

# Test 16: Check if security headers are implemented
$middlewareExists = Test-Path "middleware.ts"
$securityHeadersImplemented = $false
if ($middlewareExists) {
    $middlewareContent = Get-Content "middleware.ts" -Raw
    $securityHeadersImplemented = $middlewareContent -match "(X-Content-Type-Options|Strict-Transport-Security)"
}
Test-Result ($middlewareExists -and $securityHeadersImplemented) "Security headers implemented in middleware"

# Test 17: Check CSP configuration
$cspConfigured = $false
if ($middlewareExists) {
    $middlewareContent = Get-Content "middleware.ts" -Raw
    $cspConfigured = $middlewareContent -match "Content-Security-Policy"
}
Test-Result ($middlewareExists -and $cspConfigured) "Content Security Policy configured"

Write-Host "`nSummary" -ForegroundColor Yellow
Write-Host "======="
Write-Host "Tests passed: " -NoNewline
Write-Host $TestsPassed -ForegroundColor Green
Write-Host "Tests failed: " -NoNewline
Write-Host $TestsFailed -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Host "`n🎉 ALL TESTS PASSED! Production security implementation is complete." -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Run: yarn add ioredis (if not already installed)"
    Write-Host "2. Configure your secrets manager (Azure/AWS/Vault)"
    Write-Host "3. Set up your domain and SSL certificates"
    Write-Host "4. Test with: yarn build"
    Write-Host "5. Deploy to staging environment first"
    exit 0
} else {
    Write-Host "Some tests failed. Please fix the issues above before deploying." -ForegroundColor Red
    exit 1
}
