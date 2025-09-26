# PowerShell script to redirect npm to yarn
# Add this to your PowerShell profile for this project

function npm {
    Write-Host "🚨 WARNING: This project uses YARN exclusively!" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ npm is not recommended for this project" -ForegroundColor Yellow  
    Write-Host "✅ Use yarn instead:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  yarn install    # Install dependencies"
    Write-Host "  yarn dev        # Development server"  
    Write-Host "  yarn build      # Production build"
    Write-Host "  yarn add <pkg>  # Add dependency"
    Write-Host ""
    
    # Automatic conversion suggestion
    $command = $args -join " "
    if ($command) {
        $yarnCommand = $command -replace "install", "install" -replace "run ", ""
        Write-Host "💡 Suggestion: yarn $yarnCommand" -ForegroundColor Cyan
        
        $response = Read-Host "Do you want to run this yarn command? (y/N)"
        if ($response -eq "y" -or $response -eq "Y" -or $response -eq "yes") {
            Invoke-Expression "yarn $yarnCommand"
        }
    }
}