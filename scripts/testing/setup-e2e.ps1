# ===================================================================
# Script PowerShell de Setup pour Tests E2E
# ===================================================================
# Ce script simplifie la configuration de l'environnement de test E2E
# Pour Windows/WSL
# ===================================================================

Write-Host "🚀 Setup E2E Testing Environment" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# 1. Vérifier WSL
# ===================================================================
Write-Host "📋 Étape 1: Vérification de WSL" -ForegroundColor Blue

try {
    $wslVersion = wsl --version 2>$null
    Write-Host "✓ WSL installé" -ForegroundColor Green
} catch {
    Write-Host "❌ WSL n'est pas installé ou configuré" -ForegroundColor Red
    Write-Host "   Installez WSL: wsl --install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ===================================================================
# 2. Exécuter le script bash dans WSL
# ===================================================================
Write-Host "📋 Étape 2: Exécution du script de setup dans WSL" -ForegroundColor Blue

$projectPath = "/home/corentin/M-C-Billetterie"
$scriptPath = "$projectPath/scripts/testing/setup-e2e.sh"

Write-Host "   Passage à WSL..." -ForegroundColor Yellow

# Rendre le script exécutable et l'exécuter
wsl bash -c "cd $projectPath && chmod +x $scriptPath && $scriptPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Green
    Write-Host "✅ Setup terminé avec succès !" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez maintenant lancer les tests :" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  wsl bash -c 'cd $projectPath && yarn test:e2e'" -ForegroundColor Blue
    Write-Host "  wsl bash -c 'cd $projectPath && yarn test:e2e:ui'" -ForegroundColor Blue
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors du setup" -ForegroundColor Red
    Write-Host "   Vérifiez les logs ci-dessus" -ForegroundColor Yellow
    exit 1
}

