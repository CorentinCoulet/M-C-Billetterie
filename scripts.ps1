param(
    [string]$Action = "help",
    [switch]$NoBuild,
    [switch]$Rebuild,
    [switch]$Clean
)

function Show-Help {
    Write-Host "Commandes disponibles :"
    Write-Host "  install          - Installe les dependances"
    Write-Host "  dev              - Lance l'environnement de developpement"
    Write-Host "  dev-docker       - Lance l'environnement de developpement avec Docker"
    Write-Host "  build            - Build l'application"
    Write-Host "  test             - Lance les tests"
    Write-Host "  test-coverage    - Lance les tests avec coverage"
    Write-Host "  db-setup         - Configure la base de donnees"
    Write-Host "  docker-dev-up    - Lance tous les services en mode developpement"
    Write-Host "  docker-dev-down  - Arrete les services de developpement"
    Write-Host "  docker-prod-up   - Lance tous les services en mode production"
    Write-Host "  monitoring-up    - Lance le monitoring"
    Write-Host "  clean            - Nettoie les containers et volumes Docker"
    Write-Host "  lint             - Lance le linting"
    Write-Host "  type-check       - Verifie les types TypeScript"
    Write-Host ""
    Write-Host "Options disponibles :"
    Write-Host "  -NoBuild         - Skip le build Docker (utilise l'image existante)"
    Write-Host "  -Rebuild         - Force le rebuild complet (--no-cache)"
    Write-Host "  -Clean           - Nettoie les images avant de rebuild"
}

function Install-Dependencies {
    Write-Host "Installation des dependances..."
    yarn install
}

function Start-Dev {
    Write-Host "Lancement du developpement..."
    yarn dev
}

function Start-DevDocker {
    Write-Host "Lancement du developpement avec Docker..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    Write-Host "Environnement de developpement lance sur http://localhost:3000"
}

function Build-App {
    Write-Host "Build de l'application..."
    npm run build
}

function Run-Tests {
    Write-Host "Lancement des tests..."
    npm test
}

function Run-TestsCoverage {
    Write-Host "Lancement des tests avec coverage..."
    npm run test:coverage
}

function Setup-Database {
    Write-Host "Configuration de la base de donnees..."
    npm run db:generate
    npm run db:migrate
}

function Docker-Dev-Up {
    Write-Host "Lancement des services de developpement..."
    
    if ($Clean) {
        Write-Host "Nettoyage des images Docker..."
        docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans
        docker system prune -f
    }
    
    if ($NoBuild) {
        Write-Host "Demarrage rapide sans rebuild..."
        docker-compose -f docker-compose.dev.yml up -d --no-build
    } elseif ($Rebuild) {
        Write-Host "Rebuild complet force..."
        docker-compose -f docker-compose.dev.yml up -d --build --no-cache
    } else {
        docker-compose -f docker-compose.dev.yml up -d
    }
    
    Write-Host "Services de developpement lances !"
    Write-Host "Application: http://localhost:3001"
}

function Docker-Dev-Down {
    Write-Host "Arret des services de developpement..."
    docker-compose -f docker-compose.dev.yml down
}

function Docker-Prod-Up {
    Write-Host "Lancement des services de production..."
    
    if ($Clean) {
        Write-Host "Nettoyage des images Docker..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --rmi all --volumes --remove-orphans
        docker system prune -f
    }
    
    if ($NoBuild) {
        Write-Host "Demarrage rapide sans rebuild..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
    } elseif ($Rebuild) {
        Write-Host "Rebuild complet force..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-cache
    } else {
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    }
    
    Write-Host "Services de production lances !"
    Write-Host "Application: http://localhost:3000"
}

function Monitoring-Up {
    Write-Host "Lancement du monitoring..."
    docker-compose -f docker-compose.monitoring.yml up -d
    Write-Host "Monitoring lance :"
    Write-Host "  - Prometheus: http://localhost:9090"
    Write-Host "  - Grafana: http://localhost:3001"
}

function Clean-Docker {
    Write-Host "Nettoyage des containers et volumes..."
    docker-compose down -v --remove-orphans
    docker system prune -f
}

function Run-Lint {
    Write-Host "Lancement du linting..."
    npm run lint
}

function Check-Types {
    Write-Host "Verification des types TypeScript..."
    npm run type-check
}

# Exécution selon l'action demandée
switch ($Action.ToLower()) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "dev" { Start-Dev }
    "dev-docker" { Start-DevDocker }
    "build" { Build-App }
    "test" { Run-Tests }
    "test-coverage" { Run-TestsCoverage }
    "db-setup" { Setup-Database }
    "docker-dev-up" { Docker-Dev-Up }
    "docker-dev-down" { Docker-Dev-Down }
    "docker-prod-up" { Docker-Prod-Up }
    "monitoring-up" { Monitoring-Up }
    "clean" { Clean-Docker }
    "lint" { Run-Lint }
    "type-check" { Check-Types }
    default { 
        Write-Host 'Action inconnue:' $Action
        Show-Help 
    }
}
