# ========================================
# Scripts de Deploiement Kubernetes
# ========================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('install', 'deploy-simple', 'deploy-terraform', 'status', 'logs', 'restart', 'scale', 'stop', 'cleanup', 'help')]
    [string]$Action = 'help',
    
    [Parameter(Mandatory=$false)]
    [int]$Replicas = 3
)

$ErrorActionPreference = "Stop"

# Couleurs
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

function Show-Help {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  BILLETTERIE - KUBERNETES DEPLOYMENT  " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE: .\k8s-deploy.ps1 -Action <action> [-Replicas <nombre>]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ACTIONS DISPONIBLES:" -ForegroundColor Green
    Write-Host "  install           Installe les outils necessaires" -ForegroundColor White
    Write-Host "  deploy-simple     Deploiement simple avec Kubernetes" -ForegroundColor White
    Write-Host "  deploy-terraform  Deploiement avec Terraform + Kubernetes" -ForegroundColor White
    Write-Host "  status            Affiche l'etat de tous les composants" -ForegroundColor White
    Write-Host "  logs              Affiche les logs en temps reel" -ForegroundColor White
    Write-Host "  restart           Redemarre l'application" -ForegroundColor White
    Write-Host "  scale             Scale l'application (utiliser -Replicas)" -ForegroundColor White
    Write-Host "  stop              Arrete tous les pods" -ForegroundColor White
    Write-Host "  cleanup           Supprime tout" -ForegroundColor White
    Write-Host "  help              Affiche cette aide" -ForegroundColor White
    Write-Host ""
    Write-Host "EXEMPLES:" -ForegroundColor Yellow
    Write-Host "  .\k8s-deploy.ps1 -Action deploy-simple" -ForegroundColor Gray
    Write-Host "  .\k8s-deploy.ps1 -Action status" -ForegroundColor Gray
    Write-Host "  .\k8s-deploy.ps1 -Action scale -Replicas 5" -ForegroundColor Gray
    Write-Host ""
}

function Test-Prerequisites {
    Write-Info "Verification des prerequis..."
    
    $tools = @{
        'kubectl' = 'kubectl version --client'
        'docker' = 'docker --version'
    }
    
    foreach ($tool in $tools.Keys) {
        try {
            Invoke-Expression $tools[$tool] | Out-Null
            Write-Success "  OK $tool installe"
        }
        catch {
            Write-Error "  ERREUR $tool non trouve"
            return $false
        }
    }
    
    try {
        kubectl cluster-info | Out-Null
        Write-Success "  OK Connexion au cluster Kubernetes"
    }
    catch {
        Write-Error "  ERREUR Impossible de se connecter au cluster"
        Write-Warning "  Activez Kubernetes dans Docker Desktop"
        return $false
    }
    
    return $true
}

function Install-Tools {
    Write-Info "Installation des outils..."
    
    if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Info "Installation de Chocolatey..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    Write-Info "Installation de kubectl..."
    choco install kubernetes-cli -y
    
    Write-Info "Installation de Docker Desktop..."
    choco install docker-desktop -y
    
    Write-Success "Installation terminee !"
    Write-Warning "Redemarrez votre terminal et activez Kubernetes dans Docker Desktop"
}

function Deploy-Simple {
    Write-Info "Deploiement simple avec Kubernetes..."
    
    if (!(Test-Prerequisites)) { return }
    
    Write-Info "Creation du namespace..."
    kubectl create namespace billetterie --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Info "Creation des secrets..."
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $redisPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    kubectl create secret generic billetterie-secrets `
        --from-literal=DATABASE_URL="postgresql://billetterie:$dbPassword@postgres:5432/billetterie" `
        --from-literal=JWT_SECRET="$jwtSecret" `
        --from-literal=REDIS_PASSWORD="$redisPassword" `
        --from-literal=ENCRYPTION_KEY="$encryptionKey" `
        --from-literal=SESSION_SECRET="$jwtSecret" `
        --namespace=billetterie `
        --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Success "  Secrets crees"
    
    Write-Info "Deploiement de l'application..."
    kubectl apply -f k8s/production.yaml
    
    Write-Success "Deploiement lance !"
    Write-Info "Attente du demarrage des pods..."
    
    kubectl wait --for=condition=ready pod -l app=billetterie -n billetterie --timeout=300s
    
    Write-Success "Application deployee avec succes !"
    Write-Info ""
    Write-Info "Pour acceder a l'application:"
    Write-Info "   kubectl port-forward -n billetterie svc/billetterie-app 3000:3000"
    Write-Info "   Puis ouvrir: http://localhost:3000"
}

function Deploy-Terraform {
    Write-Info "Deploiement avec Terraform + Kubernetes..."
    
    if (!(Test-Prerequisites)) { return }
    
    if (!(Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-Error "Terraform non installe. Utilisez: choco install terraform -y"
        return
    }
    
    Push-Location infrastructure/terraform
    
    try {
        Write-Info "Initialisation de Terraform..."
        terraform init
        
        Write-Info "Planification..."
        terraform plan -out=tfplan
        
        Write-Info "Application..."
        terraform apply tfplan
        
        Write-Success "Infrastructure Terraform creee !"
        
        Pop-Location
        
        Write-Info "Deploiement de l'application..."
        kubectl apply -f k8s/production.yaml
        
        Write-Success "Deploiement complet termine !"
        
        Write-Info ""
        Write-Info "Commandes utiles:"
        Write-Info "   kubectl get pods -n billetterie"
        Write-Info "   kubectl port-forward -n billetterie svc/billetterie-app 3000:3000"
        Write-Info "   kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80"
    }
    catch {
        Pop-Location
        Write-Error "Erreur lors du deploiement: $_"
    }
}

function Show-Status {
    Write-Info "Etat de l'application..."
    
    if (!(Test-Prerequisites)) { return }
    
    Write-Info ""
    Write-Info "======================================"
    Write-Info "  PODS"
    Write-Info "======================================"
    kubectl get pods -n billetterie -o wide
    
    Write-Info ""
    Write-Info "======================================"
    Write-Info "  SERVICES"
    Write-Info "======================================"
    kubectl get services -n billetterie
    
    Write-Info ""
    Write-Info "======================================"
    Write-Info "  HPA (Auto-scaling)"
    Write-Info "======================================"
    kubectl get hpa -n billetterie
    
    Write-Info ""
    Write-Info "======================================"
    Write-Info "  VOLUMES PERSISTANTS"
    Write-Info "======================================"
    kubectl get pvc -n billetterie
    
    Write-Info ""
    Write-Info "======================================"
    Write-Info "  METRIQUES"
    Write-Info "======================================"
    kubectl top pods -n billetterie
}

function Show-Logs {
    Write-Info "Logs de l'application..."
    
    if (!(Test-Prerequisites)) { return }
    
    kubectl logs -f deployment/billetterie-app -n billetterie --all-containers=true
}

function Restart-App {
    Write-Info "Redemarrage de l'application..."
    
    if (!(Test-Prerequisites)) { return }
    
    kubectl rollout restart deployment/billetterie-app -n billetterie
    
    Write-Success "Redemarrage en cours..."
    Write-Info "Attente..."
    
    kubectl rollout status deployment/billetterie-app -n billetterie
    
    Write-Success "Application redemarree !"
}

function Scale-App {
    Write-Info "Scaling de l'application a $Replicas pods..."
    
    if (!(Test-Prerequisites)) { return }
    
    kubectl scale deployment billetterie-app --replicas=$Replicas -n billetterie
    
    Write-Success "Scaling effectue !"
    Write-Info "Nouveaux pods:"
    kubectl get pods -n billetterie -l app=billetterie
}

function Stop-App {
    Write-Info "Arret de l'application..."
    
    if (!(Test-Prerequisites)) { return }
    
    Write-Warning "Cette action va arreter tous les pods (les donnees seront conservees)"
    $confirm = Read-Host "Confirmer ? (oui/non)"
    
    if ($confirm -eq "oui") {
        kubectl scale deployment billetterie-app --replicas=0 -n billetterie
        Write-Success "Application arretee"
    }
    else {
        Write-Info "Annule"
    }
}

function Cleanup-All {
    Write-Warning "ATTENTION: Cette action va TOUT supprimer (application + donnees) !"
    Write-Warning "Cette action est IRREVERSIBLE !"
    $confirm = Read-Host "Taper 'SUPPRIMER' pour confirmer"
    
    if ($confirm -eq "SUPPRIMER") {
        Write-Info "Suppression en cours..."
        kubectl delete namespace billetterie
        Write-Success "Nettoyage termine"
    }
    else {
        Write-Info "Annule"
    }
}

# ========================================
# Main
# ========================================

switch ($Action) {
    'install'           { Install-Tools }
    'deploy-simple'     { Deploy-Simple }
    'deploy-terraform'  { Deploy-Terraform }
    'status'            { Show-Status }
    'logs'              { Show-Logs }
    'restart'           { Restart-App }
    'scale'             { Scale-App }
    'stop'              { Stop-App }
    'cleanup'           { Cleanup-All }
    'help'              { Show-Help }
    default             { Show-Help }
}
