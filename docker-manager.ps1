# ====================================================================================
# DOCKER MANAGER - Billetterie (Enhanced Version)
# ====================================================================================
# Usage: .\docker-manager.ps1 -Action <action> [options]
# ====================================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet(
        'dev', 'dev-monitoring', 'prod', 'prod-monitoring', 'prod-full',
        'status', 'logs', 'stop-dev', 'stop-prod', 'stop-all', 'restart',
        'down', 'down-v', 'down-full',
        'ports', 'test-pg', 'test-redis', 'test-all', 'health', 'metrics',
        'backup', 'restore', 'clean-volumes', 'prune', 'seed',
        'k8s-deploy', 'k8s-status', 'k8s-clean',
        'help'
    )]
    [string]$Action = 'help',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'prod', 'all')]
    [string]$Environment = 'dev',
    
    [Parameter(Mandatory=$false)]
    [switch]$Build,
    
    [Parameter(Mandatory=$false)]
    [switch]$Follow,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseMode,
    
    [Parameter(Mandatory=$false)]
    [switch]$WithMonitoring,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSeed,
    
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$ErrorActionPreference = "Continue"

# ====================================================================================
# CENTRALIZED CONFIGURATION
# ====================================================================================

$Script:Config = @{
    NetworkName = "billetterie-network"
    LogDir = ".\logs"
    BackupDir = ".\backups"
    MaxLogSize = 10MB
    HealthCheckTimeout = 60
    HealthCheckInterval = 2
    
    Ports = @{
        DevApp = 3001
        ProdApp = 3000
        PostgresqlDev = 5433
        PostgresqlProd = 5432
        RedisDev = 6380
        RedisProd = 6379
        Adminer = 8081
        RedisCommander = 8084
        Mailhog = 8025
        MailhogSMTP = 1025
        Grafana = 3001
        Prometheus = 9090
    }
    
    Containers = @{
        DevApp = "billetterie-app-dev"
        ProdApp = "billetterie-app"
        PostgresqlDev = "postgres-dev"
        PostgresqlProd = "postgres"
        RedisDev = "redis-dev"
        RedisProd = "redis"
        Mailhog = "mailhog"
        Adminer = "adminer"
        RedisCommander = "redis-commander"
    }
    
    ComposeFiles = @{
        Dev = "docker-compose.dev.yml"
        Prod = @("docker-compose.yml", "docker-compose.prod.yml")
        Monitoring = "docker-compose.monitoring.yml"
    }
}

# ====================================================================================
# LOGGING & UTILITIES
# ====================================================================================

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error', 'Debug')]
        [string]$Level = 'Info'
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $colorMap = @{
        'Info' = 'Cyan'
        'Success' = 'Green'
        'Warning' = 'Yellow'
        'Error' = 'Red'
        'Debug' = 'Gray'
    }
    
    $iconMap = @{
        'Info' = ' '
        'Success' = ' '
        'Warning' = '   '
        'Error' = ' '
        'Debug' = ' '
    }
    
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Affichage console
    if ($Level -ne 'Debug' -or $Verbose) {
        Write-Host "$($iconMap[$Level]) $Message" -ForegroundColor $colorMap[$Level]
    }
    
    # Écriture dans le fichier log
    if (!(Test-Path $Script:Config.LogDir)) {
        New-Item -ItemType Directory -Path $Script:Config.LogDir -Force | Out-Null
    }
    
    Add-Content -Path "$($Script:Config.LogDir)\docker-manager.log" -Value $logMessage -ErrorAction SilentlyContinue
    
    # Rotation des logs
    $logFile = Get-Item "$($Script:Config.LogDir)\docker-manager.log" -ErrorAction SilentlyContinue
    if ($logFile -and $logFile.Length -gt $Script:Config.MaxLogSize) {
        $archiveName = "docker-manager_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
        Move-Item $logFile.FullName "$($Script:Config.LogDir)\$archiveName" -ErrorAction SilentlyContinue
        Write-Log "Log archivé: $archiveName" -Level Debug
    }
}

function Test-Prerequisites {
    Write-Log "Vérification des prérequis..." -Level Info
    
    $prerequisites = @(
        @{ Name = "Docker"; Command = "docker --version" }
        @{ Name = "Docker Compose"; Command = "docker-compose --version" }
    )
    
    $allOk = $true
    foreach ($prereq in $prerequisites) {
        try {
            $result = Invoke-Expression $prereq.Command 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "$($prereq.Name) détecté: $result" -Level Debug
                Write-Log "$($prereq.Name) installé" -Level Success
            } else {
                Write-Log "$($prereq.Name) non trouvé" -Level Error
                $allOk = $false
            }
        } catch {
            Write-Log "$($prereq.Name) non trouvé: $_" -Level Error
            $allOk = $false
        }
    }
    
    # Vérifier que Docker daemon est actif
    try {
        $null = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker daemon actif" -Level Success
        } else {
            Write-Log "Docker daemon non accessible" -Level Error
            $allOk = $false
        }
    } catch {
        Write-Log "Docker daemon non accessible: $_" -Level Error
        $allOk = $false
    }
    
    if (-not $allOk) {
        Write-Log "Certains prérequis sont manquants. Veuillez installer Docker Desktop." -Level Error
    }
    
    return $allOk
}

function Test-PortAvailable {
    param([int]$Port)
    
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connection) {
            Write-Log "Port $Port déjà utilisé par PID $($connection.OwningProcess)" -Level Debug
            return $false
        }
        return $true
    } catch {
        return $true
    }
}

function Test-PortsAvailability {
    param([array]$Ports)
    
    $unavailablePorts = @()
    foreach ($port in $Ports) {
        if (!(Test-PortAvailable $port)) {
            $unavailablePorts += $port
        }
    }
    
    if ($unavailablePorts.Count -gt 0) {
        Write-Log "Ports déjà utilisés: $($unavailablePorts -join ', ')" -Level Warning
        $response = Read-Host "Continuer quand même? (o/N)"
        return ($response -eq 'o' -or $response -eq 'O')
    }
    
    return $true
}

function Wait-ForContainer {
    param(
        [string]$ContainerName,
        [int]$TimeoutSeconds = 60
    )
    
    Write-Log "Attente du démarrage de $ContainerName..." -Level Info
    $elapsed = 0
    $interval = $Script:Config.HealthCheckInterval
    
    while ($elapsed -lt $TimeoutSeconds) {
        # Vérifier si le conteneur existe et est en cours d'exécution
        $containerStatus = docker inspect --format='{{.State.Status}}' $ContainerName 2>$null
        
        if ($containerStatus -eq "running") {
            # Vérifier le health check s'il existe
            $healthStatus = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
            
            if ($healthStatus -eq "healthy" -or $healthStatus -eq "") {
                Write-Log "$ContainerName est prêt" -Level Success
                return $true
            } elseif ($healthStatus -eq "unhealthy") {
                Write-Log "$ContainerName est unhealthy" -Level Warning
            } else {
                Write-Log "$ContainerName démarre... ($healthStatus)" -Level Debug
            }
        } elseif ($containerStatus -eq "exited") {
            Write-Log "$ContainerName a quitté de façon inattendue" -Level Error
            return $false
        }
        
        if ($VerboseMode) {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
        
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }
    
    Write-Log "$ContainerName n'a pas démarré dans les temps ($TimeoutSeconds secondes)" -Level Error
    return $false
}

function Get-ContainerMetrics {
    param([string]$ContainerName)
    
    try {
        $stats = docker stats $ContainerName --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}|{{.BlockIO}}" 2>$null
        if ($stats -and $LASTEXITCODE -eq 0) {
            $parts = $stats -split '\|'
            return @{
                Container = $ContainerName
                CPU = $parts[0]
                Memory = $parts[1]
                Network = $parts[2]
                BlockIO = $parts[3]
            }
        }
    } catch {
        Write-Log "Impossible d'obtenir les métriques pour $ContainerName" -Level Debug
    }
    return $null
}

function Invoke-DockerCompose {
    param(
        [string[]]$ComposeFiles,
        [string]$Command,
        [switch]$IgnoreErrors
    )
    
    $fileArgs = @()
    foreach ($file in $ComposeFiles) {
        $fileArgs += "-f"
        $fileArgs += $file
    }
    
    $fullCommand = "docker-compose $($fileArgs -join ' ') $Command"
    Write-Log "Exécution: $fullCommand" -Level Debug
    
    try {
        Invoke-Expression $fullCommand
        if ($LASTEXITCODE -ne 0 -and -not $IgnoreErrors) {
            Write-Log "Erreur lors de l'exécution de docker-compose" -Level Error
            return $false
        }
        return $true
    } catch {
        if (-not $IgnoreErrors) {
            Write-Log "Exception: $_" -Level Error
        }
        return $false
    }
}

# ====================================================================================
# FUNCTIONS
# ====================================================================================

function Show-Help {
    Write-Host ""
    Write-Host "DOCKER MANAGER - Billetterie (v2.0)" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\docker-manager.ps1 -Action <action> [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "ENVIRONNEMENTS:" -ForegroundColor Green
    Write-Host "  -Action dev                    DEV - Développement complet" -ForegroundColor White
    Write-Host "  -Action dev-monitoring         DEV + Monitoring" -ForegroundColor White
    Write-Host "  -Action prod                   PROD - Production" -ForegroundColor White
    Write-Host "  -Action prod-monitoring        PROD + Monitoring" -ForegroundColor White
    Write-Host "  -Action prod-full              PROD + Monitoring + Outils" -ForegroundColor White
    Write-Host ""
    Write-Host "GESTION:" -ForegroundColor Green
    Write-Host "  -Action status                 Voir le statut" -ForegroundColor White
    Write-Host "  -Action health                 Vérifier la santé des services" -ForegroundColor White
    Write-Host "  -Action metrics                Métriques de performance" -ForegroundColor White
    Write-Host "  -Action logs [-Follow]         Voir les logs" -ForegroundColor White
    Write-Host "  -Action restart                Redémarrer" -ForegroundColor White
    Write-Host ""
    Write-Host "ARRÊT (DOWN):" -ForegroundColor Red
    Write-Host "  -Action stop-dev                 Arrêter DEV (ancien)" -ForegroundColor DarkGray
    Write-Host "  -Action stop-prod                Arrêter PROD (ancien)" -ForegroundColor DarkGray
    Write-Host "  -Action stop-all                 Arrêter TOUT (ancien)" -ForegroundColor DarkGray
    Write-Host "  -Action down                   Down simple (env + monitoring optionnel)" -ForegroundColor White
    Write-Host "  -Action down-v                 Down + Volumes + Orphelins" -ForegroundColor Yellow
    Write-Host "  -Action down-full              Down + Volumes + Prune complet" -ForegroundColor Red
    Write-Host ""
    Write-Host "TESTS:" -ForegroundColor Green
    Write-Host "  -Action test-pg                Tester PostgreSQL" -ForegroundColor White
    Write-Host "  -Action test-redis             Tester Redis" -ForegroundColor White
    Write-Host "  -Action test-all               Tester tous les services" -ForegroundColor White
    Write-Host ""
    Write-Host "UTILITAIRES:" -ForegroundColor Green
    Write-Host "  -Action ports                  Afficher les ports" -ForegroundColor White
    Write-Host "  -Action seed                   Exécuter le seed (données de test)" -ForegroundColor White
    Write-Host "  -Action backup                 Backup DB" -ForegroundColor White
    Write-Host "  -Action restore                  Restaurer DB" -ForegroundColor White
    Write-Host "  -Action clean-volumes          Nettoyer volumes" -ForegroundColor White
    Write-Host "  -Action prune                    Nettoyer Docker complet" -ForegroundColor White
    Write-Host ""
    Write-Host "KUBERNETES:" -ForegroundColor Magenta
    Write-Host "  -Action k8s-deploy               Déployer K8s" -ForegroundColor White
    Write-Host "  -Action k8s-status             État K8s" -ForegroundColor White
    Write-Host "  -Action k8s-clean              Nettoyer K8s" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -Build                       Rebuild les images avant de démarrer" -ForegroundColor White
    Write-Host "  -Follow                      Suivre les logs en temps réel" -ForegroundColor White
    Write-Host "  -Verbose                     Mode verbeux avec détails" -ForegroundColor White
    Write-Host "  -Environment <dev|prod|all>  Spécifier l'environnement" -ForegroundColor White
    Write-Host "  -WithMonitoring              Inclure le monitoring (avec down/down-v)" -ForegroundColor White
    Write-Host "  -SkipSeed                    Ne pas exécuter le seed au démarrage de DEV" -ForegroundColor White
    Write-Host "  -BackupFile <fichier>        Fichier pour restauration" -ForegroundColor White
    Write-Host ""
    Write-Host "EXEMPLES:" -ForegroundColor Cyan
    Write-Host "  .\docker-manager.ps1 -Action dev" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action dev -Build -Verbose" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action dev -SkipSeed" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action seed -Environment dev" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action logs -Environment dev -Follow" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action down -Environment dev" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action down -Environment dev -WithMonitoring" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action down-v -Environment prod" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action down-full" -ForegroundColor Gray
    Write-Host "  .\docker-manager.ps1 -Action backup -Environment prod" -ForegroundColor Gray
    Write-Host ""
}

function Ensure-DockerNetwork {
    $networkName = $Script:Config.NetworkName
    $networkExists = docker network ls --format '{{.Name}}' | Select-String -Pattern "^$networkName$"
    
    if (-not $networkExists) {
        Write-Log "Création du réseau Docker: $networkName" -Level Info
        docker network create $networkName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Réseau créé avec succès" -Level Success
            return $true
        } else {
            Write-Log "Erreur lors de la création du réseau" -Level Error
            return $false
        }
    }
    Write-Log "Réseau $networkName déjà existant" -Level Debug
    return $true
}

function Start-DevEnvironment {
    Write-Log "Démarrage de l'environnement DEV..." -Level Info
    
    if (!(Test-Prerequisites)) { return }
    if (!(Ensure-DockerNetwork)) { return }
    
    # Vérifier les ports critiques
    $portsToCheck = @(
        $Script:Config.Ports.DevApp,
        $Script:Config.Ports.PostgresqlDev,
        $Script:Config.Ports.RedisDev
    )
    
    if (!(Test-PortsAvailability $portsToCheck)) {
        Write-Log "Annulation du démarrage" -Level Warning
        return
    }
    
    if ($Build) {
        Write-Log "Build des images..." -Level Info
        if (!(Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "build")) {
            Write-Log "Erreur lors du build" -Level Error
            return
        }
    }
    
    Write-Log "Démarrage des conteneurs..." -Level Info
    if (!(Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "up -d")) {
        Write-Log "Erreur lors du démarrage" -Level Error
        return
    }
    
    # Attendre que les services soient prêts
    Write-Log "Vérification de l'état des services..." -Level Info
    $containers = @(
        $Script:Config.Containers.PostgresqlDev,
        $Script:Config.Containers.RedisDev
    )
    
    $allReady = $true
    foreach ($container in $containers) {
        if (!(Wait-ForContainer -ContainerName $container -TimeoutSeconds $Script:Config.HealthCheckTimeout)) {
            $allReady = $false
        }
    }
    
    if ($allReady) {
        Write-Log "Environnement DEV démarré avec succès!" -Level Success
        
        if (-not $SkipSeed) {
            # Exécuter les migrations Prisma
            Write-Host ""
            Write-Log "Exécution des migrations Prisma..." -Level Info
            try {
                $migrationResult = docker exec $($Script:Config.Containers.DevApp) yarn prisma migrate deploy 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Migrations Prisma appliquées avec succès" -Level Success
                } else {
                    Write-Log "Avertissement lors des migrations Prisma (peut-être déjà appliquées)" -Level Warning
                }
            } catch {
                Write-Log "Erreur lors des migrations Prisma: $_" -Level Warning
            }
            
            # Executer le seed
            Write-Host ""
            Write-Log "Execution du seed pour creer les donnees de test..." -Level Info
            try {
                $seedResult = docker exec $($Script:Config.Containers.DevApp) yarn db:seed 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Seed execute avec succes - Donnees de test creees!" -Level Success
                    Write-Host ""
                    Write-Host "  Jeu de donnees complet cree:" -ForegroundColor Cyan
                    Write-Host "     1 Admin, 4 Organisateurs, 5 Utilisateurs" -ForegroundColor White
                    Write-Host "     11 Evenements, 8 Commandes" -ForegroundColor White
                    Write-Host ""
                    Write-Host "  Connexion rapide:" -ForegroundColor Yellow
                    Write-Host "     Admin:  admin@demo.com / admin123" -ForegroundColor White
                } else {
                    Write-Log "Avertissement lors du seed (peut-etre deja execute)" -Level Warning
                }
            } catch {
                Write-Log "Erreur lors du seed: $_" -Level Warning
                Write-Log "Vous pouvez executer manuellement: docker exec $($Script:Config.Containers.DevApp) yarn db:seed" -Level Info
            }
        } else {
            Write-Log "Seed ignore (option -SkipSeed activee)" -Level Info
        }
        
        Write-Host ""
        Write-Host "  Services disponibles:" -ForegroundColor Cyan
        Write-Host "   Application:      http://localhost:$($Script:Config.Ports.DevApp)" -ForegroundColor White
        Write-Host "   Adminer:          http://localhost:$($Script:Config.Ports.Adminer)" -ForegroundColor White
        Write-Host "   Redis Commander:  http://localhost:$($Script:Config.Ports.RedisCommander)" -ForegroundColor White
        Write-Host "   Mailhog:          http://localhost:$($Script:Config.Ports.Mailhog)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Log "Certains services n'ont pas demarre correctement" -Level Warning
        Write-Log "Verifiez les logs avec: .\docker-manager.ps1 -Action logs -Environment dev" -Level Info
    }
}

function Start-DevMonitoring {
    Write-Log "Démarrage de DEV + Monitoring..." -Level Info
    
    if (!(Test-Prerequisites)) { return }
    if (!(Ensure-DockerNetwork)) { return }
    
    $composeFiles = @($Script:Config.ComposeFiles.Dev, $Script:Config.ComposeFiles.Monitoring)
    
    if ($Build) {
        Write-Log "Build des images..." -Level Info
        if (!(Invoke-DockerCompose -ComposeFiles $composeFiles -Command "build")) {
            Write-Log "Erreur lors du build" -Level Error
            return
        }
    }
    
    Write-Log "Démarrage des conteneurs..." -Level Info
    if (Invoke-DockerCompose -ComposeFiles $composeFiles -Command "up -d") {
        Write-Log "DEV + Monitoring démarré avec succès!" -Level Success
        
        if (-not $SkipSeed) {
            # Exécuter les migrations et le seed
            Write-Host ""
            Write-Log "Exécution des migrations et du seed..." -Level Info
            try {
                npm run prisma:migrate:dev 2>&1 | Out-Null
                Write-Log "Migrations appliquées" -Level Success
                
                $seedResult = npm run db:seed 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "Seed exécuté avec succès" -Level Success
                }
            } catch {
                Write-Log "Avertissement lors du seed: $_" -Level Warning
            }
        }
        
        Write-Host ""
        Write-Host "  Services disponibles:" -ForegroundColor Cyan
        Write-Host "   Application:      http://localhost:$($Script:Config.Ports.DevApp)" -ForegroundColor White
        Write-Host "   Grafana:          http://localhost:$($Script:Config.Ports.Grafana)" -ForegroundColor White
        Write-Host "   Prometheus:       http://localhost:$($Script:Config.Ports.Prometheus)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Log "Erreur lors du démarrage" -Level Error
    }
}

function Start-ProdEnvironment {
    Write-Log "Démarrage de l'environnement PROD..." -Level Info
    
    if (!(Test-Prerequisites)) { return }
    if (!(Ensure-DockerNetwork)) { return }
    
    $composeFiles = $Script:Config.ComposeFiles.Prod
    
    if ($Build) {
        Write-Log "Build des images..." -Level Info
        if (!(Invoke-DockerCompose -ComposeFiles $composeFiles -Command "build")) {
            Write-Log "Erreur lors du build" -Level Error
            return
        }
    }
    
    Write-Log "Démarrage des conteneurs..." -Level Info
    if (Invoke-DockerCompose -ComposeFiles $composeFiles -Command "up -d") {
        # Attendre les services critiques
        $containers = @(
            $Script:Config.Containers.PostgresqlProd,
            $Script:Config.Containers.RedisProd
        )
        
        foreach ($container in $containers) {
            Wait-ForContainer -ContainerName $container -TimeoutSeconds $Script:Config.HealthCheckTimeout | Out-Null
        }
        
        Write-Log "Environnement PROD démarré avec succès!" -Level Success
        Write-Host ""
        Write-Host "  Application: http://localhost:$($Script:Config.Ports.ProdApp)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Log "Erreur lors du démarrage" -Level Error
    }
}

function Start-ProdMonitoring {
    Write-Log "Démarrage de PROD + Monitoring..." -Level Info
    
    if (!(Test-Prerequisites)) { return }
    if (!(Ensure-DockerNetwork)) { return }
    
    $composeFiles = $Script:Config.ComposeFiles.Prod + @($Script:Config.ComposeFiles.Monitoring)
    
    if ($Build) {
        Write-Log "Build des images..." -Level Info
        if (!(Invoke-DockerCompose -ComposeFiles $composeFiles -Command "build")) {
            Write-Log "Erreur lors du build" -Level Error
            return
        }
    }
    
    Write-Log "Démarrage des conteneurs..." -Level Info
    if (Invoke-DockerCompose -ComposeFiles $composeFiles -Command "up -d") {
        Write-Log "PROD + Monitoring démarré avec succès!" -Level Success
        Write-Host ""
        Write-Host "  Services disponibles:" -ForegroundColor Cyan
        Write-Host "   Application:      http://localhost:$($Script:Config.Ports.ProdApp)" -ForegroundColor White
        Write-Host "   Grafana:          http://localhost:$($Script:Config.Ports.Grafana)" -ForegroundColor White
        Write-Host "   Prometheus:       http://localhost:$($Script:Config.Ports.Prometheus)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Log "Erreur lors du démarrage" -Level Error
    }
}

function Start-ProdFull {
    Write-Log "Démarrage de PROD complet..." -Level Info
    
    if (!(Test-Prerequisites)) { return }
    if (!(Ensure-DockerNetwork)) { return }
    
    $composeFiles = $Script:Config.ComposeFiles.Prod + @($Script:Config.ComposeFiles.Monitoring)
    
    if ($Build) {
        Write-Log "Build des images..." -Level Info
        if (!(Invoke-DockerCompose -ComposeFiles $composeFiles -Command "build")) {
            Write-Log "Erreur lors du build" -Level Error
            return
        }
    }
    
    Write-Log "Démarrage de l'environnement complet..." -Level Info
    Invoke-DockerCompose -ComposeFiles $composeFiles -Command "up -d" | Out-Null
    Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command "--profile tools up -d" | Out-Null
    
    Write-Log "PROD complet démarré avec succès!" -Level Success
    Write-Host ""
    Write-Host "  Tous les services sont maintenant actifs" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Status {
    Write-Log "Statut des conteneurs..." -Level Info
    Write-Host ""
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    
    # Comptage des conteneurs
    $running = (docker ps -q | Measure-Object).Count
    $stopped = (docker ps -aq -f status=exited | Measure-Object).Count
    
    Write-Host "  Résumé: " -NoNewline -ForegroundColor Cyan
    Write-Host "$running conteneurs actifs, $stopped arrêtés" -ForegroundColor White
    Write-Host ""
}

function Show-Logs {
    Write-Log "Logs de l'environnement $Environment..." -Level Info
    
    $command = if ($Follow) { "logs -f" } else { "logs --tail=50" }
    
    switch ($Environment) {
        "dev" {
            Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command $command
        }
        "prod" {
            Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command $command
        }
        "all" {
            Write-Log "Affichage des logs de tous les conteneurs..." -Level Info
            docker-compose $command
        }
    }
}

function Stop-DevEnvironment {
    Write-Log "Arrêt de l'environnement DEV..." -Level Warning
    
    if (Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "down") {
        Write-Log "DEV arrêté avec succès" -Level Success
    } else {
        Write-Log "Erreur lors de l'arrêt" -Level Error
    }
}

function Stop-ProdEnvironment {
    Write-Log "Arrêt de l'environnement PROD..." -Level Warning
    
    if (Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command "down") {
        Write-Log "PROD arrêté avec succès" -Level Success
    } else {
        Write-Log "Erreur lors de l'arrêt" -Level Error
    }
}

function Stop-AllEnvironments {
    Write-Log "Arrêt de TOUS les conteneurs..." -Level Warning
    
    Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "down" -IgnoreErrors | Out-Null
    Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command "down" -IgnoreErrors | Out-Null
    Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Monitoring) -Command "down" -IgnoreErrors | Out-Null
    
    Write-Log "Tous les conteneurs ont été arrêtés" -Level Success
}

function Invoke-Down {
    Write-Log "Arrêt de l'environnement $Environment..." -Level Warning
    Write-Host ""
    
    # Determine compose files based on environment and monitoring flag
    $composeFiles = @()
    
    if ($Environment -eq "dev") {
        $composeFiles += $Script:Config.ComposeFiles.Dev
        if ($WithMonitoring) {
            $composeFiles += $Script:Config.ComposeFiles.Monitoring
            Write-Log "Arrêt de DEV + Monitoring" -Level Info
        } else {
            Write-Log "Arrêt de DEV" -Level Info
        }
    }
    elseif ($Environment -eq "prod") {
        $composeFiles += $Script:Config.ComposeFiles.Prod
        if ($WithMonitoring) {
            $composeFiles += $Script:Config.ComposeFiles.Monitoring
            Write-Log "Arrêt de PROD + Monitoring" -Level Info
        } else {
            Write-Log "Arrêt de PROD" -Level Info
        }
    }
    elseif ($Environment -eq "all") {
        $composeFiles = @($Script:Config.ComposeFiles.Dev) + $Script:Config.ComposeFiles.Prod + @($Script:Config.ComposeFiles.Monitoring)
        Write-Log "Arrêt de TOUS les environnements" -Level Info
    }
    
    # Execute down command
    foreach ($file in $composeFiles) {
        Invoke-DockerCompose -ComposeFiles @($file) -Command "down" -IgnoreErrors | Out-Null
    }
    
    Write-Log "Environnement(s) arrêté(s) avec succès" -Level Success
    Write-Host ""
}

function Invoke-DownWithVolumes {
    Write-Log "Arrêt avec suppression des volumes pour $Environment..." -Level Warning
    Write-Host ""
    Write-Host "    ATTENTION: Cette opération supprimera les volumes (données des bases de données)!" -ForegroundColor Red
    Write-Host ""
    
    $confirm = Read-Host "Êtes-vous sûr? Tapez 'OUI' pour confirmer"
    
    if ($confirm -ne "OUI") {
        Write-Log "Opération annulée" -Level Warning
        return
    }
    
    # Determine compose files
    $composeFiles = @()
    
    if ($Environment -eq "dev") {
        $composeFiles += $Script:Config.ComposeFiles.Dev
        if ($WithMonitoring) {
            $composeFiles += $Script:Config.ComposeFiles.Monitoring
        }
    }
    elseif ($Environment -eq "prod") {
        $composeFiles += $Script:Config.ComposeFiles.Prod
        if ($WithMonitoring) {
            $composeFiles += $Script:Config.ComposeFiles.Monitoring
        }
    }
    elseif ($Environment -eq "all") {
        $composeFiles = @($Script:Config.ComposeFiles.Dev) + $Script:Config.ComposeFiles.Prod + @($Script:Config.ComposeFiles.Monitoring)
    }
    
    # Execute down with volumes and remove orphans
    foreach ($file in $composeFiles) {
        Invoke-DockerCompose -ComposeFiles @($file) -Command "down -v --remove-orphans" -IgnoreErrors | Out-Null
    }
    
    Write-Log "Environnement(s) et volumes supprimés avec succès" -Level Success
    Write-Host ""
}

function Invoke-DownFull {
    Write-Log "Arrêt complet avec nettoyage Docker..." -Level Warning
    Write-Host ""
    Write-Host "    ATTENTION: Cette opération va:" -ForegroundColor Red
    Write-Host "   1. Arrêter tous les conteneurs" -ForegroundColor Yellow
    Write-Host "   2. Supprimer tous les volumes" -ForegroundColor Yellow
    Write-Host "   3. Supprimer les conteneurs orphelins" -ForegroundColor Yellow
    Write-Host "   4. Nettoyer les images, réseaux et cache Docker (prune)" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Êtes-vous sûr? Tapez 'OUI' pour confirmer"
    
    if ($confirm -ne "OUI") {
        Write-Log "Opération annulée" -Level Warning
        return
    }
    
    Write-Host ""
    Write-Log "Étape 1/4: Arrêt des conteneurs avec suppression des volumes..." -Level Info
    
    # Stop all environments with volumes and orphans
    Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "down -v --remove-orphans" -IgnoreErrors | Out-Null
    Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command "down -v --remove-orphans" -IgnoreErrors | Out-Null
    Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Monitoring) -Command "down -v --remove-orphans" -IgnoreErrors | Out-Null
    
    Write-Log "  Conteneurs et volumes supprimés" -Level Success
    
    Write-Host ""
    Write-Log "Étape 2/4: Nettoyage des images non utilisées..." -Level Info
    docker image prune -af 2>&1 | Out-Null
    Write-Log "  Images nettoyées" -Level Success
    
    Write-Host ""
    Write-Log "Étape 3/4: Nettoyage des réseaux..." -Level Info
    docker network prune -f 2>&1 | Out-Null
    Write-Log "  Réseaux nettoyés" -Level Success
    
    Write-Host ""
    Write-Log "Étape 4/4: Nettoyage du cache de build..." -Level Info
    docker builder prune -af 2>&1 | Out-Null
    Write-Log "  Cache de build nettoyé" -Level Success
    
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "Nettoyage complet termine!" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host ""
    
    # Display disk space
    Write-Host "Espace disque Docker:" -ForegroundColor Cyan
    docker system df 2>$null
    Write-Host ""
}

function Restart-Containers {
    Write-Log "Redémarrage des conteneurs..." -Level Info
    
    $envFiles = if ($Environment -eq "dev") {
        @($Script:Config.ComposeFiles.Dev)
    } elseif ($Environment -eq "prod") {
        $Script:Config.ComposeFiles.Prod
    } else {
        Write-Log "Spécifiez un environnement avec -Environment dev ou -Environment prod" -Level Warning
        return
    }
    
    if (Invoke-DockerCompose -ComposeFiles $envFiles -Command "restart") {
        Write-Log "Conteneurs redémarrés avec succès" -Level Success
    } else {
        Write-Log "Erreur lors du redémarrage" -Level Error
    }
}

function Show-Ports {
    Write-Host ""
    Write-Host "  PORTS UTILISÉS" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "APPLICATION:" -ForegroundColor Yellow
    Write-Host "    Next.js Dev:                http://localhost:3001" -ForegroundColor White
    Write-Host "    Next.js Prod:               http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "BASES DE DONNÉES:" -ForegroundColor Yellow
    Write-Host "    PostgreSQL Dev:             localhost:5433" -ForegroundColor White
    Write-Host "    PostgreSQL Prod:            localhost:5432" -ForegroundColor White
    Write-Host "    Redis Dev:                  localhost:6380" -ForegroundColor White
    Write-Host "    Redis Prod:                 localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "OUTILS (DEV):" -ForegroundColor Yellow
    Write-Host "      Adminer:                   http://localhost:8081" -ForegroundColor White
    Write-Host "    Redis Commander:            http://localhost:8084" -ForegroundColor White
    Write-Host "    Mailhog:                    http://localhost:8025" -ForegroundColor White
    Write-Host ""
    Write-Host "MONITORING:" -ForegroundColor Yellow
    Write-Host "    Grafana:                    http://localhost:3001" -ForegroundColor White
    Write-Host "    Prometheus:                 http://localhost:9090" -ForegroundColor White
    Write-Host ""
}

function Test-PostgreSQL {
    Write-Log "Test de connexion PostgreSQL..." -Level Info
    Write-Host ""
    
    $results = @()
    
    # Test Dev
    Write-Host "Development (localhost:$($Script:Config.Ports.PostgresqlDev)):" -ForegroundColor Yellow
    $containerName = $Script:Config.Containers.PostgresqlDev
    $isRunning = docker ps --filter "name=$containerName" --filter "status=running" -q 2>$null
    
    if ($isRunning) {
        docker exec $containerName pg_isready -h localhost -U postgres 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "PostgreSQL Dev: OK" -Level Success
            $results += @{ Env = "Dev"; Service = "PostgreSQL"; Status = "OK" }
        } else {
            Write-Log "PostgreSQL Dev: Conteneur actif mais service non prêt" -Level Warning
            $results += @{ Env = "Dev"; Service = "PostgreSQL"; Status = "NOT READY" }
        }
    } else {
        Write-Log "PostgreSQL Dev: Non démarré" -Level Error
        $results += @{ Env = "Dev"; Service = "PostgreSQL"; Status = "DOWN" }
    }
    
    Write-Host ""
    
    # Test Prod
    Write-Host "Production (localhost:$($Script:Config.Ports.PostgresqlProd)):" -ForegroundColor Yellow
    $containerName = $Script:Config.Containers.PostgresqlProd
    $isRunning = docker ps --filter "name=$containerName" --filter "status=running" -q 2>$null
    
    if ($isRunning) {
        docker exec $containerName pg_isready -h localhost -U postgres 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "PostgreSQL Prod: OK" -Level Success
            $results += @{ Env = "Prod"; Service = "PostgreSQL"; Status = "OK" }
        } else {
            Write-Log "PostgreSQL Prod: Conteneur actif mais service non prêt" -Level Warning
            $results += @{ Env = "Prod"; Service = "PostgreSQL"; Status = "NOT READY" }
        }
    } else {
        Write-Log "PostgreSQL Prod: Non démarré" -Level Error
        $results += @{ Env = "Prod"; Service = "PostgreSQL"; Status = "DOWN" }
    }
    
    Write-Host ""
    return $results
}

function Test-Redis {
    Write-Log "Test de connexion Redis..." -Level Info
    Write-Host ""
    
    $results = @()
    
    # Test Dev
    Write-Host "Development (localhost:$($Script:Config.Ports.RedisDev)):" -ForegroundColor Yellow
    $containerName = $Script:Config.Containers.RedisDev
    $isRunning = docker ps --filter "name=$containerName" --filter "status=running" -q 2>$null
    
    if ($isRunning) {
        $result = docker exec $containerName redis-cli -a password PING 2>$null
        if ($result -eq "PONG") {
            Write-Log "Redis Dev: OK" -Level Success
            $results += @{ Env = "Dev"; Service = "Redis"; Status = "OK" }
        } else {
            Write-Log "Redis Dev: Conteneur actif mais service non prêt" -Level Warning
            $results += @{ Env = "Dev"; Service = "Redis"; Status = "NOT READY" }
        }
    } else {
        Write-Log "Redis Dev: Non démarré" -Level Error
        $results += @{ Env = "Dev"; Service = "Redis"; Status = "DOWN" }
    }
    
    Write-Host ""
    
    # Test Prod
    Write-Host "Production (localhost:$($Script:Config.Ports.RedisProd)):" -ForegroundColor Yellow
    $containerName = $Script:Config.Containers.RedisProd
    $isRunning = docker ps --filter "name=$containerName" --filter "status=running" -q 2>$null
    
    if ($isRunning) {
        $result = docker exec $containerName redis-cli -a password PING 2>$null
        if ($result -eq "PONG") {
            Write-Log "Redis Prod: OK" -Level Success
            $results += @{ Env = "Prod"; Service = "Redis"; Status = "OK" }
        } else {
            Write-Log "Redis Prod: Conteneur actif mais service non prêt" -Level Warning
            $results += @{ Env = "Prod"; Service = "Redis"; Status = "NOT READY" }
        }
    } else {
        Write-Log "Redis Prod: Non démarré" -Level Error
        $results += @{ Env = "Prod"; Service = "Redis"; Status = "DOWN" }
    }
    
    Write-Host ""
    return $results
}

function Test-AllServices {
    Write-Log "Test complet de tous les services..." -Level Info
    Write-Host ""
    
    $allResults = @()
    
    # Test PostgreSQL
    $pgResults = Test-PostgreSQL
    $allResults += $pgResults
    
    # Test Redis
    $redisResults = Test-Redis
    $allResults += $redisResults
    
    # Test Web Applications
    Write-Log "Test des applications..." -Level Info
    Write-Host ""
    
    foreach ($env in @('dev', 'prod')) {
        $containerName = if ($env -eq 'dev') { $Script:Config.Containers.DevApp } else { $Script:Config.Containers.ProdApp }
        $port = if ($env -eq 'dev') { $Script:Config.Ports.DevApp } else { $Script:Config.Ports.ProdApp }
        
        Write-Host "$env (localhost:$port):" -ForegroundColor Yellow
        $isRunning = docker ps --filter "name=$containerName" --filter "status=running" -q 2>$null
        
        if ($isRunning) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
                Write-Log "Application ${env} (HTTP $($response.StatusCode)): OK" -Level Success
                $allResults += @{ Env = $env; Service = "Application"; Status = "OK" }
            } catch {
                Write-Log "Application ${env}: Conteneur actif mais HTTP non disponible" -Level Warning
                $allResults += @{ Env = $env; Service = "Application"; Status = "NOT READY" }
            }
        } else {
            Write-Log "Application ${env}: Non demarree" -Level Error
            $allResults += @{ Env = $env; Service = "Application"; Status = "DOWN" }
        }
        Write-Host ""
    }
    
    # Summary
    $okCount = ($allResults | Where-Object { $_.Status -eq "OK" }).Count
    $totalCount = $allResults.Count
    
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "RESUME: $okCount/$totalCount services operationnels" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host ""
    
    return $allResults
}

function Show-Metrics {
    Write-Log "Métriques des conteneurs en cours d'exécution..." -Level Info
    Write-Host ""
    
    $runningContainers = docker ps --format "{{.Names}}" 2>$null
    
    if (-not $runningContainers) {
        Write-Log "Aucun conteneur en cours d'exécution" -Level Warning
        return
    }
    
    Write-Host "                                                                                  " -ForegroundColor Cyan
    Write-Host "  Conteneur                    CPU           Mémoire            Réseau I/O        " -ForegroundColor Cyan
    Write-Host "                                                                                  " -ForegroundColor Cyan
    
    foreach ($container in $runningContainers) {
        $metrics = Get-ContainerMetrics -ContainerName $container
        if ($metrics) {
            $nameColumn = $container.PadRight(26).Substring(0, 26)
            $cpuColumn = $metrics.CPU.PadRight(11).Substring(0, 11)
            $memColumn = $metrics.Memory.PadRight(16).Substring(0, 16)
            $netColumn = $metrics.Network.PadRight(16).Substring(0, 16)
            Write-Host "  $nameColumn   $cpuColumn   $memColumn   $netColumn  " -ForegroundColor White
        }
    }
    
    Write-Host "                                                                                  " -ForegroundColor Cyan
    Write-Host ""
}

function Backup-Database {
    Write-Log "Création d'un backup de la base de données..." -Level Info
    
    if (!(Test-Path $Script:Config.BackupDir)) {
        New-Item -ItemType Directory -Path $Script:Config.BackupDir -Force | Out-Null
        Write-Log "Répertoire de backup créé: $($Script:Config.BackupDir)" -Level Debug
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_${Environment}_$timestamp.sql"
    $backupPath = Join-Path $Script:Config.BackupDir $backupFile
    
    $dbContainer = if ($Environment -eq "dev") { 
        $Script:Config.Containers.PostgresqlDev 
    } else { 
        $Script:Config.Containers.PostgresqlProd 
    }
    
    # Vérifier que le conteneur est actif
    $isRunning = docker ps --filter "name=$dbContainer" --filter "status=running" -q 2>$null
    if (-not $isRunning) {
        Write-Log "Le conteneur $dbContainer n'est pas actif" -Level Error
        return
    }
    
    Write-Log "Backup depuis le conteneur: $dbContainer" -Level Info
    Write-Log "Fichier de destination: $backupFile" -Level Debug
    
    docker exec $dbContainer pg_dump -U postgres billetterie > $backupPath 2>&1
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupPath)) {
        $size = (Get-Item $backupPath).Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        Write-Log "Backup créé: $backupFile ($sizeKB KB)" -Level Success
        
        # Optional compression
        try {
            $zipPath = "$backupPath.zip"
            Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force -ErrorAction Stop
            $zipSize = (Get-Item $zipPath).Length
            $zipSizeKB = [math]::Round($zipSize / 1KB, 2)
            Remove-Item $backupPath -Force
            Write-Log "Backup compressé: $backupFile.zip ($zipSizeKB KB)" -Level Success
            Write-Host ""
            Write-Host "  Backup sauvegardé dans: $($Script:Config.BackupDir)\$backupFile.zip" -ForegroundColor Green
            Write-Host ""
        } catch {
            Write-Log "Compression échouée, fichier .sql conservé: $_" -Level Warning
            Write-Host ""
            Write-Host "  Backup sauvegardé dans: $backupPath" -ForegroundColor Green
            Write-Host ""
        }
        
        # Display existing backups
        $backups = Get-ChildItem $Script:Config.BackupDir -Filter "backup_*.sql*" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
        if ($backups) {
            Write-Host "  Derniers backups:" -ForegroundColor Cyan
            foreach ($backup in $backups) {
                $backupSize = [math]::Round($backup.Length / 1024, 2)
                $msg = '   - {0} ({1} KB) - {2}' -f $backup.Name, $backupSize, $backup.LastWriteTime
                Write-Host $msg -ForegroundColor Gray
            }
            Write-Host ""
        }
    } else {
        Write-Log "Erreur lors du backup" -Level Error
    }
}

function Restore-Database {
    Write-Log "Restauration de la base de données..." -Level Info
    
    if (-not $BackupFile) {
        # Lister les backups disponibles
        $backups = Get-ChildItem $Script:Config.BackupDir -Filter "backup_*.sql*" -ErrorAction SilentlyContinue | 
                   Sort-Object LastWriteTime -Descending
        
        if (-not $backups) {
            Write-Log "Aucun backup trouvé dans $($Script:Config.BackupDir)" -Level Error
            return
        }
        
        Write-Host ""
        Write-Host "  Backups disponibles:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $backups.Count; $i++) {
            $size = [math]::Round($backups[$i].Length / 1KB, 2)
            Write-Host "   [$i] $($backups[$i].Name) ($size KB) - $($backups[$i].LastWriteTime)" -ForegroundColor White
        }
        Write-Host ""
        
        $selection = Read-Host "Sélectionnez un backup (numéro) ou appuyez sur Entrée pour annuler"
        if ([string]::IsNullOrWhiteSpace($selection)) {
            Write-Log "Restauration annulée" -Level Warning
            return
        }
        
        try {
            $selectedIndex = [int]$selection
            if ($selectedIndex -lt 0 -or $selectedIndex -ge $backups.Count) {
                Write-Log "Sélection invalide" -Level Error
                return
            }
            $BackupFile = $backups[$selectedIndex].FullName
        } catch {
            Write-Log "Sélection invalide" -Level Error
            return
        }
    } else {
        $BackupFile = Join-Path $Script:Config.BackupDir $BackupFile
        if (-not (Test-Path $BackupFile)) {
            Write-Log "Fichier de backup introuvable: $BackupFile" -Level Error
            return
        }
    }
    
    Write-Log "Fichier sélectionné: $BackupFile" -Level Info
    
    # Décompresser si nécessaire
    $sqlFile = $BackupFile
    if ($BackupFile -like "*.zip") {
        Write-Log "Décompression du backup..." -Level Info
        $tempDir = Join-Path $Script:Config.BackupDir "temp_restore"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        
        try {
            Expand-Archive -Path $BackupFile -DestinationPath $tempDir -Force
            $sqlFile = Get-ChildItem $tempDir -Filter "*.sql" | Select-Object -First 1 -ExpandProperty FullName
            if (-not $sqlFile) {
                Write-Log "Aucun fichier .sql trouvé dans l'archive" -Level Error
                return
            }
        } catch {
            Write-Log "Erreur lors de la décompression: $_" -Level Error
            return
        }
    }
    
    Write-Host ""
    Write-Host "    ATTENTION: Cette opération va ÉCRASER la base de données actuelle!" -ForegroundColor Red
    $confirm = Read-Host "Continuer? Tapez 'OUI' pour confirmer"
    
    if ($confirm -ne "OUI") {
        Write-Log "Restauration annulée" -Level Warning
        if ($BackupFile -like "*.zip" -and (Test-Path $tempDir)) {
            Remove-Item $tempDir -Recurse -Force
        }
        return
    }
    
    $dbContainer = if ($Environment -eq "dev") { 
        $Script:Config.Containers.PostgresqlDev 
    } else { 
        $Script:Config.Containers.PostgresqlProd 
    }
    
    # Vérifier que le conteneur est actif
    $isRunning = docker ps --filter "name=$dbContainer" --filter "status=running" -q 2>$null
    if (-not $isRunning) {
        Write-Log "Le conteneur $dbContainer n'est pas actif" -Level Error
        return
    }
    
    Write-Log "Restauration en cours..." -Level Info
    
    # Copier le fichier dans le conteneur
    docker cp $sqlFile "${dbContainer}:/tmp/restore.sql"
    
    # Restaurer
    docker exec $dbContainer psql -U postgres -d billetterie -f /tmp/restore.sql 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Base de données restaurée avec succès!" -Level Success
        # Nettoyer
        docker exec $dbContainer rm /tmp/restore.sql 2>&1 | Out-Null
    } else {
        Write-Log "Erreur lors de la restauration" -Level Error
    }
    
    # Nettoyage du dossier temporaire
    if ($BackupFile -like "*.zip" -and (Test-Path $tempDir)) {
        Remove-Item $tempDir -Recurse -Force
    }
}

function Clean-Volumes {
    Write-Log "Nettoyage des volumes Docker..." -Level Warning
    Write-Host ""
    Write-Host "    ATTENTION: Cette opération supprimera TOUTES les données des volumes!" -ForegroundColor Red
    Write-Host "    Cela inclut les bases de données, le cache Redis, etc." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Êtes-vous sûr? Tapez 'OUI' pour confirmer"
    
    if ($confirm -eq "OUI") {
        Write-Log "Suppression des volumes en cours..." -Level Info
        
        Invoke-DockerCompose -ComposeFiles @($Script:Config.ComposeFiles.Dev) -Command "down -v" -IgnoreErrors | Out-Null
        Invoke-DockerCompose -ComposeFiles $Script:Config.ComposeFiles.Prod -Command "down -v" -IgnoreErrors | Out-Null
        
        Write-Log "Volumes nettoyés avec succès" -Level Success
    } else {
        Write-Log "Opération annulée" -Level Warning
    }
}

function Invoke-DockerPrune {
    Write-Log "Nettoyage complet de Docker..." -Level Warning
    Write-Host ""
    Write-Host "    Cette opération va supprimer:" -ForegroundColor Red
    Write-Host "   - Tous les conteneurs arrêtés" -ForegroundColor Yellow
    Write-Host "   - Tous les réseaux non utilisés" -ForegroundColor Yellow
    Write-Host "   - Toutes les images non utilisées" -ForegroundColor Yellow
    Write-Host "   - Tout le cache de build" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continuer? Tapez 'OUI' pour confirmer"
    
    if ($confirm -eq "OUI") {
        Write-Log "Nettoyage en cours..." -Level Info
        
        docker system prune -af --volumes
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Nettoyage Docker terminé" -Level Success
            
            # Display freed space
            Write-Host ""
            docker system df
            Write-Host ""
        } else {
            Write-Log "Erreur lors du nettoyage" -Level Error
        }
    } else {
        Write-Log "Opération annulée" -Level Warning
    }
}

function Deploy-Kubernetes {
    Write-Log "Déploiement sur Kubernetes..." -Level Info
    
    if (Test-Path ".\k8s-deploy.ps1") {
        & ".\k8s-deploy.ps1" -Action deploy-simple
    } else {
        Write-Log "Script k8s-deploy.ps1 introuvable" -Level Error
    }
}

function Show-KubernetesStatus {
    Write-Log "État de Kubernetes..." -Level Info
    
    if (Test-Path ".\k8s-deploy.ps1") {
        & ".\k8s-deploy.ps1" -Action status
    } else {
        Write-Log "Script k8s-deploy.ps1 introuvable" -Level Error
    }
}

function Clean-Kubernetes {
    Write-Log "Nettoyage de Kubernetes..." -Level Warning
    
    if (Test-Path ".\k8s-deploy.ps1") {
        & ".\k8s-deploy.ps1" -Action cleanup
    } else {
        Write-Log "Script k8s-deploy.ps1 introuvable" -Level Error
    }
}

function Invoke-Seed {
    Write-Log "Execution du seed de la base de donnees..." -Level Info
    Write-Host ""
    
    # Verifier que la base de donnees est accessible
    Write-Log "Verification de la connexion a la base de donnees..." -Level Info
    $dbContainer = if ($Environment -eq "dev") { 
        $Script:Config.Containers.PostgresqlDev 
    } else { 
        $Script:Config.Containers.PostgresqlProd 
    }
    
    $isRunning = docker ps --filter "name=$dbContainer" --filter "status=running" -q 2>$null
    if (-not $isRunning) {
        Write-Log "Le conteneur PostgreSQL ($dbContainer) n'est pas actif" -Level Error
        Write-Log "Demarrez l'environnement d'abord avec: .\docker-manager.ps1 -Action dev" -Level Info
        return
    }
    
    Write-Log "Base de donnees accessible" -Level Success
    Write-Host ""
    
    # Determiner le conteneur applicatif
    $appContainer = if ($Environment -eq "dev") {
        $Script:Config.Containers.DevApp
    } else {
        $Script:Config.Containers.ProdApp
    }
    
    # Executer les migrations
    Write-Log "Application des migrations Prisma..." -Level Info
    try {
        docker exec $appContainer yarn prisma migrate deploy 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Migrations appliquees avec succes" -Level Success
        }
    } catch {
        Write-Log "Erreur lors des migrations: $_" -Level Warning
    }
    
    Write-Host ""
    
    # Executer le seed
    Write-Log "Execution du seed..." -Level Info
    try {
        $seedOutput = docker exec $appContainer yarn db:seed 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Seed execute avec succes!" -Level Success
            Write-Host ""
            Write-Host "  Jeu de donnees complet cree:" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Statistiques:" -ForegroundColor Cyan
            Write-Host "     1 Admin" -ForegroundColor White
            Write-Host "     4 Organisateurs" -ForegroundColor White
            Write-Host "     5 Utilisateurs" -ForegroundColor White
            Write-Host "     11 Evenements" -ForegroundColor White
            Write-Host "     8 Commandes" -ForegroundColor White
            Write-Host ""
            Write-Host "  Compte admin:" -ForegroundColor Yellow
            Write-Host "     admin@demo.com / admin123" -ForegroundColor White
            Write-Host ""
            Write-Host "  Tous les mots de passe:" -ForegroundColor Yellow
            Write-Host "     Organisateurs: organizer123" -ForegroundColor White
            Write-Host "     Utilisateurs:  user123" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Log "Erreur lors du seed" -Level Error
            Write-Host $seedOutput
        }
    } catch {
        Write-Log "Erreur lors du seed: $_" -Level Error
    }
}

# ====================================================================================
# MAIN
# ====================================================================================

$startTime = Get-Date

Write-Host ""
Write-Host "    Docker Manager - Billetterie v2.0" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($VerboseMode) {
    Write-Log "Mode verbeux active" -Level Debug
    Write-Log "Action: $Action" -Level Debug
    Write-Log "Environnement: $Environment" -Level Debug
}

# Execute action
try {
    switch ($Action) {
        # Environments
        'dev'                { Start-DevEnvironment }
        'dev-monitoring'     { Start-DevMonitoring }
        'prod'               { Start-ProdEnvironment }
        'prod-monitoring'    { Start-ProdMonitoring }
        'prod-full'          { Start-ProdFull }
        
        # Management
        'status'             { Show-Status }
        'health'             { Test-AllServices | Out-Null }
        'metrics'            { Show-Metrics }
        'logs'               { Show-Logs }
        'stop-dev'           { Stop-DevEnvironment }
        'stop-prod'          { Stop-ProdEnvironment }
        'stop-all'           { Stop-AllEnvironments }
        'restart'            { Restart-Containers }
        
        # Down operations (new)
        'down'               { Invoke-Down }
        'down-v'             { Invoke-DownWithVolumes }
        'down-full'          { Invoke-DownFull }
        
        # Tests
        'test-pg'            { Test-PostgreSQL | Out-Null }
        'test-redis'         { Test-Redis | Out-Null }
        'test-all'           { Test-AllServices | Out-Null }
        
        # Utilities
        'ports'              { Show-Ports }
        'seed'               { Invoke-Seed }
        'backup'             { Backup-Database }
        'restore'            { Restore-Database }
        'clean-volumes'      { Clean-Volumes }
        'prune'              { Invoke-DockerPrune }
        
        # Kubernetes
        'k8s-deploy'         { Deploy-Kubernetes }
        'k8s-status'         { Show-KubernetesStatus }
        'k8s-clean'          { Clean-Kubernetes }
        
        # Help
        'help'               { Show-Help }
        default              { Show-Help }
    }
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    if ($VerboseMode) {
        Write-Log "Execution terminee en $([math]::Round($duration, 2)) secondes" -Level Debug
    }
    
} catch {
    Write-Log "Erreur critique: $_" -Level Error
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level Debug
    exit 1
}

Write-Host ""

