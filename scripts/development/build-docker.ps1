# Script PowerShell pour build Docker avec gestion d'erreurs
# Usage: .\scripts\build-docker.ps1

Write-Host "🐳 Starting Docker build process..." -ForegroundColor Cyan

# Vérifier si Docker est disponible
try {
    docker --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not available or not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Nettoyer les images et containers précédents
Write-Host "🧹 Cleaning up previous builds..." -ForegroundColor Yellow
docker system prune -f --filter "until=24h" 2>$null

# Variables d'environnement pour le build
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

# Build avec gestion d'erreurs
Write-Host "🏗️ Building Docker image..." -ForegroundColor Cyan

try {
    # Build l'image avec timeout étendu
    docker compose build --no-cache --parallel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker build completed successfully!" -ForegroundColor Green
        
        # Afficher les images créées
        Write-Host "`n📦 Created images:" -ForegroundColor Cyan
        docker images | Select-String "billetterie"
        
    } else {
        throw "Docker build failed with exit code $LASTEXITCODE"
    }
    
} catch {
    Write-Host "`n❌ Docker build failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    Write-Host "`n🔍 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check if all environment variables are set" -ForegroundColor White
    Write-Host "2. Verify Docker has enough memory (recommend 4GB+)" -ForegroundColor White
    Write-Host "3. Try: docker system prune -a" -ForegroundColor White
    Write-Host "4. Check logs: docker compose logs" -ForegroundColor White
    
    # Afficher les logs des containers en erreur
    Write-Host "`n📋 Recent Docker logs:" -ForegroundColor Yellow
    docker compose logs --tail=20 2>$null
    
    exit 1
}

# Test optionnel
$test = Read-Host "`n🧪 Do you want to test the built image? (y/N)"
if ($test -eq "y" -or $test -eq "Y") {
    Write-Host "🚀 Starting test container..." -ForegroundColor Cyan
    
    try {
        docker compose up -d
        Start-Sleep -Seconds 10
        
        # Test de santé basique
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 30 -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Container is running successfully!" -ForegroundColor Green
            Write-Host "🌐 Application available at: http://localhost:3000" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️ Container started but health check failed" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $stop = Read-Host "`nStop test container? (Y/n)"
    if ($stop -ne "n" -and $stop -ne "N") {
        docker compose down
        Write-Host "🛑 Test container stopped" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 Build process completed!" -ForegroundColor Green
