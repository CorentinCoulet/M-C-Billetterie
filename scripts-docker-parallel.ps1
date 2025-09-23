# ===================================================================
# DOCKER PARALLEL ENVIRONMENTS MANAGEMENT SCRIPTS
# ===================================================================

# Start development environment (Port 3001)
function Start-DevEnvironment {
    Write-Host "Starting DEVELOPMENT environment..." -ForegroundColor Green
    Write-Host "   - Application: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   - PostgreSQL: localhost:5432" -ForegroundColor Cyan
    Write-Host "   - Redis: localhost:6379" -ForegroundColor Cyan
    docker-compose -f docker-compose.dev.yml up -d
}

# Start production environment (Port 3002)
function Start-ProdEnvironment {
    Write-Host "Starting PRODUCTION environment..." -ForegroundColor Blue
    Write-Host "   - Application: http://localhost:3002" -ForegroundColor Cyan
    Write-Host "   - PostgreSQL: localhost:5433" -ForegroundColor Cyan
    Write-Host "   - Redis: localhost:6380" -ForegroundColor Cyan
    docker-compose -f docker-compose.prod.local.yml up -d
}

# Start BOTH environments in parallel
function Start-BothEnvironments {
    Write-Host "Starting BOTH environments in parallel..." -ForegroundColor Yellow
    Write-Host ""
    Start-DevEnvironment
    Write-Host ""
    Start-ProdEnvironment
    Write-Host ""
    Write-Host "Environments started:" -ForegroundColor Green
    Write-Host "   DEV:  http://localhost:3001 (Hot reload enabled)" -ForegroundColor Green
    Write-Host "   PROD: http://localhost:3002 (Production optimized)" -ForegroundColor Blue
}

# Stop development environment
function Stop-DevEnvironment {
    Write-Host "Stopping DEVELOPMENT environment..." -ForegroundColor Red
    docker-compose -f docker-compose.dev.yml down
}

# Stop production environment
function Stop-ProdEnvironment {
    Write-Host "Stopping PRODUCTION environment..." -ForegroundColor Red
    docker-compose -f docker-compose.prod.local.yml down
}

# Stop BOTH environments
function Stop-BothEnvironments {
    Write-Host "Stopping BOTH environments..." -ForegroundColor Red
    Stop-DevEnvironment
    Stop-ProdEnvironment
    Write-Host "All environments stopped" -ForegroundColor Green
}

# Show containers status
function Show-Status {
    Write-Host "CONTAINERS STATUS" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Show development logs
function Show-DevLogs {
    Write-Host "DEVELOPMENT LOGS" -ForegroundColor Green
    docker logs billetterie-app-dev --tail 50 -f
}

# Show production logs
function Show-ProdLogs {
    Write-Host "PRODUCTION LOGS" -ForegroundColor Blue
    docker logs billetterie-app-prod --tail 50 -f
}

# Rebuild development environment
function Rebuild-DevEnvironment {
    Write-Host "Rebuilding DEVELOPMENT environment..." -ForegroundColor DarkYellow
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml build --no-cache web-dev
    docker-compose -f docker-compose.dev.yml up -d
}

# Rebuild production environment
function Rebuild-ProdEnvironment {
    Write-Host "Rebuilding PRODUCTION environment..." -ForegroundColor DarkYellow
    docker-compose -f docker-compose.prod.local.yml down
    docker-compose -f docker-compose.prod.local.yml build --no-cache web-prod
    docker-compose -f docker-compose.prod.local.yml up -d
}

# Show help
function Show-Help {
    Write-Host ""
    Write-Host "BILLETTERIE - DOCKER ENVIRONMENTS MANAGEMENT" -ForegroundColor Magenta
    Write-Host "===============================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "MAIN COMMANDS:" -ForegroundColor Yellow
    Write-Host "  Start-DevEnvironment      - Start development environment only" -ForegroundColor Green
    Write-Host "  Start-ProdEnvironment     - Start production environment only" -ForegroundColor Blue
    Write-Host "  Start-BothEnvironments    - Start BOTH environments in parallel" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "STOP:" -ForegroundColor Yellow
    Write-Host "  Stop-DevEnvironment       - Stop development environment" -ForegroundColor Red
    Write-Host "  Stop-ProdEnvironment      - Stop production environment" -ForegroundColor Red
    Write-Host "  Stop-BothEnvironments     - Stop BOTH environments" -ForegroundColor Red
    Write-Host ""
    Write-Host "MONITORING:" -ForegroundColor Yellow
    Write-Host "  Show-Status               - Show all containers status" -ForegroundColor White
    Write-Host "  Show-DevLogs              - Show development logs in real-time" -ForegroundColor Green
    Write-Host "  Show-ProdLogs             - Show production logs in real-time" -ForegroundColor Blue
    Write-Host ""
    Write-Host "MAINTENANCE:" -ForegroundColor Yellow
    Write-Host "  Rebuild-DevEnvironment    - Completely rebuild development environment" -ForegroundColor DarkYellow
    Write-Host "  Rebuild-ProdEnvironment   - Completely rebuild production environment" -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "PORTS USED:" -ForegroundColor Yellow
    Write-Host "  DEV:  App=3001, PostgreSQL=5432, Redis=6379" -ForegroundColor Green
    Write-Host "  PROD: App=3002, PostgreSQL=5433, Redis=6380" -ForegroundColor Blue
    Write-Host ""
}

# Show help by default
Show-Help