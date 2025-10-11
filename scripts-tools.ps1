# ====================================================================================
# ENVIRONMENT MANAGEMENT SCRIPTS - PowerShell
# ====================================================================================

Write-Host "🛠️  Gestionnaire d'environnements Billetterie" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Main menu display
function Show-Menu {
    Write-Host "Que voulez-vous faire ?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ENVIRONNEMENTS:" -ForegroundColor Green
    Write-Host "  1) 🚀 DEV - Développement complet (App + DB + Outils)" -ForegroundColor White
    Write-Host "  2) 📊 DEV + Monitoring (avec Prometheus + Grafana)" -ForegroundColor White
    Write-Host "  3) 🏭 PROD - Production (App + DB)" -ForegroundColor White
    Write-Host "  4) 🏭 PROD + Monitoring" -ForegroundColor White
    Write-Host "  5) 🏭 PROD + Monitoring + Outils d'analyse" -ForegroundColor White
    Write-Host ""
    Write-Host "ACCÈS RAPIDE:" -ForegroundColor Green
    Write-Host "  10) 🗄️  Ouvrir Adminer Dev (http://localhost:8081)" -ForegroundColor White
    Write-Host "  11) 🔴 Ouvrir Redis Commander Dev (http://localhost:8084)" -ForegroundColor White
    Write-Host "  12) 🐳 Ouvrir Portainer (http://localhost:9000)" -ForegroundColor White
    Write-Host "  13) 📧 Ouvrir Mailhog (http://localhost:8025)" -ForegroundColor White
    Write-Host "  14) 📈 Ouvrir Grafana (http://localhost:3001)" -ForegroundColor White
    Write-Host "  15) 🔍 Ouvrir Prometheus (http://localhost:9090)" -ForegroundColor White
    Write-Host "  16) 🌐 Ouvrir l'application (http://localhost:3001 dev / 3000 prod)" -ForegroundColor White
    Write-Host ""
    Write-Host "GESTION:" -ForegroundColor Green
    Write-Host "  20) 📊 Voir le statut de tous les conteneurs" -ForegroundColor White
    Write-Host "  21) 📜 Voir les logs (Ctrl+C pour quitter)" -ForegroundColor White
    Write-Host "  22) ⏹️  Arrêter l'environnement DEV" -ForegroundColor White
    Write-Host "  23) ⏹️  Arrêter l'environnement PROD" -ForegroundColor White
    Write-Host "  24) ⏹️  Arrêter TOUT" -ForegroundColor White
    Write-Host "  25) 🔄 Redémarrer les conteneurs" -ForegroundColor White
    Write-Host ""
    Write-Host "UTILITAIRES:" -ForegroundColor Green
    Write-Host "  30) 🔌 Afficher tous les ports utilisés" -ForegroundColor White
    Write-Host "  31) 🧪 Tester PostgreSQL" -ForegroundColor White
    Write-Host "  32) 🧪 Tester Redis" -ForegroundColor White
    Write-Host "  33) 💾 Backup de la base de données" -ForegroundColor White
    Write-Host "  34) 🧹 Nettoyer les volumes Docker" -ForegroundColor White
    Write-Host ""
    Write-Host "KUBERNETES (Test Production-like):" -ForegroundColor Magenta
    Write-Host "  40) ☸️  Déployer sur Kubernetes local" -ForegroundColor White
    Write-Host "  41) 📊 Voir l'état Kubernetes" -ForegroundColor White
    Write-Host "  42) 🔍 Accéder à l'app Kubernetes (port-forward)" -ForegroundColor White
    Write-Host "  43) 🧹 Nettoyer Kubernetes" -ForegroundColor White
    Write-Host ""
    Write-Host "  0) ❌ Quitter" -ForegroundColor Red
    Write-Host ""
}

# Function to open a URL in the default browser
function Open-Url {
    param (
        [string]$Url,
        [string]$Name
    )
    
    Write-Host "🌐 Ouverture de $Name..." -ForegroundColor Cyan
    Start-Process $Url
    Write-Host "✅ Navigateur ouvert sur $Url" -ForegroundColor Green
}

# Function to display container status
function Show-Status {
    Write-Host "📊 Statut des conteneurs..." -ForegroundColor Cyan
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to display logs
function Show-Logs {
    param (
        [string]$Environment = "dev"
    )
    
    Write-Host "📜 Logs de l'environnement $Environment (Ctrl+C pour quitter)..." -ForegroundColor Cyan
    
    if ($Environment -eq "dev") {
        docker-compose -f docker-compose.dev.yml logs -f
    } elseif ($Environment -eq "prod") {
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    } else {
        docker-compose logs -f
    }
}

# Function to display all used ports
function Show-Ports {
    Write-Host ""
    Write-Host "🔌 PORTS UTILISÉS" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "APPLICATION:" -ForegroundColor Yellow
    Write-Host "  🌐 Next.js Dev:                http://localhost:3001" -ForegroundColor White
    Write-Host "  🌐 Next.js Prod:               http://localhost:3000" -ForegroundColor White
    Write-Host "  🐛 Debug Port:                 localhost:9229" -ForegroundColor White
    Write-Host ""
    Write-Host "BASES DE DONNÉES:" -ForegroundColor Yellow
    Write-Host "  🐘 PostgreSQL Dev:             localhost:5433" -ForegroundColor White
    Write-Host "  🐘 PostgreSQL Prod:            localhost:5432" -ForegroundColor White
    Write-Host "  🔴 Redis Dev:                  localhost:6380" -ForegroundColor White
    Write-Host "  🔴 Redis Prod:                 localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "OUTILS DE GESTION (DEV):" -ForegroundColor Yellow
    Write-Host "  🗄️  Adminer Dev:               http://localhost:8081" -ForegroundColor White
    Write-Host "  🔴 Redis Commander Dev:        http://localhost:8084" -ForegroundColor White
    Write-Host "  🐳 Portainer:                  http://localhost:9000" -ForegroundColor White
    Write-Host "  📧 Mailhog:                    http://localhost:8025" -ForegroundColor White
    Write-Host "  📧 Mailhog SMTP:               localhost:1025" -ForegroundColor White
    Write-Host ""
    Write-Host "OUTILS DE GESTION (PROD - localhost uniquement):" -ForegroundColor Yellow
    Write-Host "  🗄️  Adminer Prod:              http://localhost:8080" -ForegroundColor White
    Write-Host "  🐘 pgAdmin:                    http://localhost:8082" -ForegroundColor White
    Write-Host "  🔴 Redis Commander Prod:       http://localhost:8083" -ForegroundColor White
    Write-Host ""
    Write-Host "MONITORING:" -ForegroundColor Yellow
    Write-Host "  📈 Grafana:                    http://localhost:3001" -ForegroundColor White
    Write-Host "  🔍 Prometheus:                 http://localhost:9090" -ForegroundColor White
    Write-Host "  🚨 AlertManager:               http://localhost:9093" -ForegroundColor White
    Write-Host "  📊 Postgres Exporter:          http://localhost:9187" -ForegroundColor White
    Write-Host "  📊 Redis Exporter:             http://localhost:9121" -ForegroundColor White
    Write-Host "  📊 Node Exporter:              http://localhost:9100" -ForegroundColor White
    Write-Host ""
}

# Function to test PostgreSQL connection
function Test-PostgreSQL {
    Write-Host "🧪 Test de connexion PostgreSQL..." -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Development (localhost:5433):" -ForegroundColor Yellow
    docker exec postgres-dev pg_isready -h localhost -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL Dev: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL Dev: Non disponible" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Production (localhost:5432):" -ForegroundColor Yellow
    docker exec postgres pg_isready -h localhost -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL Prod: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL Prod: Non disponible" -ForegroundColor Red
    }
}

# Function to test Redis connection
function Test-Redis {
    Write-Host "🧪 Test de connexion Redis..." -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Development:" -ForegroundColor Yellow
    $result = docker exec redis-dev redis-cli -a password PING 2>$null
    if ($result -eq "PONG") {
        Write-Host "✅ Redis Dev: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis Dev: Non disponible" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Production:" -ForegroundColor Yellow
    $result = docker exec redis redis-cli -a password PING 2>$null
    if ($result -eq "PONG") {
        Write-Host "✅ Redis Prod: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis Prod: Non disponible" -ForegroundColor Red
    }
}

# Function to create a database backup
function Backup-Database {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    
    Write-Host "💾 Création d'un backup de la base de données..." -ForegroundColor Cyan
    Write-Host "Fichier: $backupFile" -ForegroundColor Gray
    
    $container = Read-Host "Environnement (dev/prod) [dev]"
    if ([string]::IsNullOrWhiteSpace($container)) { $container = "dev" }
    
    $dbContainer = if ($container -eq "dev") { "postgres-dev" } else { "postgres" }
    
    docker exec $dbContainer pg_dump -U postgres billetterie > ".\backups\$backupFile"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup créé avec succès: backups\$backupFile" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de la création du backup" -ForegroundColor Red
    }
}

# Function to clean Docker volumes
function Clean-Volumes {
    Write-Host "🧹 Nettoyage des volumes Docker..." -ForegroundColor Yellow
    Write-Host "⚠️  ATTENTION: Cette opération supprimera TOUTES les données!" -ForegroundColor Red
    $confirm = Read-Host "Êtes-vous sûr? Tapez 'OUI' pour confirmer"
    
    if ($confirm -eq "OUI") {
        docker-compose -f docker-compose.dev.yml down -v
        docker-compose -f docker-compose.yml down -v
        Write-Host "✅ Volumes nettoyés" -ForegroundColor Green
    } else {
        Write-Host "❌ Opération annulée" -ForegroundColor Yellow
    }
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Votre choix"
    Write-Host ""
    
    switch ($choice) {
        "1" {
            Write-Host "🚀 Démarrage de l'environnement DEV complet..." -ForegroundColor Cyan
            docker-compose -f docker-compose.dev.yml up -d
            Write-Host "✅ Environnement DEV démarré!" -ForegroundColor Green
            Write-Host "📍 Application: http://localhost:3001" -ForegroundColor White
            Write-Host "📍 Adminer: http://localhost:8081" -ForegroundColor White
            Write-Host "📍 Redis Commander: http://localhost:8084" -ForegroundColor White
            Write-Host "📍 Mailhog: http://localhost:8025" -ForegroundColor White
            Write-Host "📍 Portainer: http://localhost:9000" -ForegroundColor White
        }
        
        "2" {
            Write-Host "🚀 Démarrage de DEV + Monitoring..." -ForegroundColor Cyan
            docker-compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d
            Write-Host "✅ Environnement DEV + Monitoring démarré!" -ForegroundColor Green
            Write-Host "📍 Grafana: http://localhost:3001" -ForegroundColor White
            Write-Host "📍 Prometheus: http://localhost:9090" -ForegroundColor White
        }
        
        "3" {
            Write-Host "🚀 Démarrage de l'environnement PROD..." -ForegroundColor Cyan
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
            Write-Host "✅ Environnement PROD démarré!" -ForegroundColor Green
            Write-Host "📍 Application: http://localhost:3000" -ForegroundColor White
        }
        
        "4" {
            Write-Host "🚀 Démarrage de PROD + Monitoring..." -ForegroundColor Cyan
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
            Write-Host "✅ Environnement PROD + Monitoring démarré!" -ForegroundColor Green
        }
        
        "5" {
            Write-Host "🚀 Démarrage de PROD + Monitoring + Outils..." -ForegroundColor Cyan
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile tools up -d
            Write-Host "✅ Environnement PROD complet démarré!" -ForegroundColor Green
            Write-Host "📍 Outils accessibles uniquement via localhost (sécurité)" -ForegroundColor Yellow
        }
        
        "10" { Open-Url "http://localhost:8081" "Adminer Dev" }
        "11" { Open-Url "http://localhost:8084" "Redis Commander Dev" }
        "12" { Open-Url "http://localhost:9000" "Portainer" }
        "13" { Open-Url "http://localhost:8025" "Mailhog" }
        "14" { Open-Url "http://localhost:3001" "Grafana" }
        "15" { Open-Url "http://localhost:9090" "Prometheus" }
        "16" { 
            $env = Read-Host "Environnement (dev/prod) [dev]"
            if ([string]::IsNullOrWhiteSpace($env)) { $env = "dev" }
            $port = if ($env -eq "dev") { "3001" } else { "3000" }
            Open-Url "http://localhost:$port" "Application" 
        }
        
        "20" { Show-Status }
        "21" { 
            $env = Read-Host "Environnement (dev/prod/all) [dev]"
            if ([string]::IsNullOrWhiteSpace($env)) { $env = "dev" }
            Show-Logs $env
        }
        "22" { 
            Write-Host "⏹️  Arrêt de l'environnement DEV..." -ForegroundColor Yellow
            docker-compose -f docker-compose.dev.yml down
            Write-Host "✅ Environnement DEV arrêté" -ForegroundColor Green
        }
        "23" { 
            Write-Host "⏹️  Arrêt de l'environnement PROD..." -ForegroundColor Yellow
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
            Write-Host "✅ Environnement PROD arrêté" -ForegroundColor Green
        }
        "24" { 
            Write-Host "⏹️  Arrêt de TOUS les conteneurs..." -ForegroundColor Yellow
            docker-compose -f docker-compose.dev.yml down
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
            docker-compose -f docker-compose.monitoring.yml down
            Write-Host "✅ Tous les conteneurs sont arrêtés" -ForegroundColor Green
        }
        "25" { 
            Write-Host "🔄 Redémarrage des conteneurs..." -ForegroundColor Yellow
            docker-compose restart
            Write-Host "✅ Conteneurs redémarrés" -ForegroundColor Green
        }
        
        "30" { Show-Ports }
        "31" { Test-PostgreSQL }
        "32" { Test-Redis }
        "33" { Backup-Database }
        "34" { Clean-Volumes }
        
        "40" {
            Write-Host "☸️  Déploiement sur Kubernetes local..." -ForegroundColor Cyan
            Write-Host ""
            Write-Host "⚠️  Vérifiez que Kubernetes est activé dans Docker Desktop !" -ForegroundColor Yellow
            Write-Host ""
            $confirm = Read-Host "Continuer ? (o/n)"
            if ($confirm -eq "o") {
                & ".\k8s-deploy.ps1" -Action deploy-simple
            }
        }
        "41" {
            Write-Host "📊 État de Kubernetes..." -ForegroundColor Cyan
            & ".\k8s-deploy.ps1" -Action status
        }
        "42" {
            Write-Host "🔍 Création du tunnel vers l'application..." -ForegroundColor Cyan
            Write-Host "L'application sera accessible sur http://localhost:3000" -ForegroundColor Green
            Write-Host "Appuyez sur Ctrl+C pour arrêter le tunnel" -ForegroundColor Yellow
            kubectl port-forward -n billetterie svc/billetterie-app 3000:3000
        }
        "43" {
            Write-Host "🧹 Nettoyage de Kubernetes..." -ForegroundColor Yellow
            $confirm = Read-Host "⚠️  Cela va supprimer TOUS les déploiements Kubernetes. Confirmer ? (oui/non)"
            if ($confirm -eq "oui") {
                & ".\k8s-deploy.ps1" -Action cleanup
            } else {
                Write-Host "❌ Annulé" -ForegroundColor Red
            }
        }
        
        "0" { 
            Write-Host "👋 Au revoir!" -ForegroundColor Cyan
            break
        }
        
        default { 
            Write-Host "❌ Choix invalide" -ForegroundColor Red
        }
    }
    
    if ($choice -ne "0" -and $choice -ne "21") {
        Write-Host ""
        Read-Host "Appuyez sur Entrée pour continuer"
        Clear-Host
    }
    
} while ($choice -ne "0")
