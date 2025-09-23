# Scripts PowerShell pour simplifier les commandes du projet Billetterie
param(
    [string]$Action = "help"
)

# Couleurs pour l'affichage
$Green = "`e[32m"
$Blue = "`e[36m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Show-Help {
    Write-Host "${Blue}Commandes disponibles :${Reset}"
    Write-Host "${Green}  install${Reset}          - Installe les dépendances"
    Write-Host "${Green}  dev${Reset}              - Lance l'environnement de développement"
    Write-Host "${Green}  dev-docker${Reset}       - Lance l'environnement de développement avec Docker"
    Write-Host "${Green}  build${Reset}            - Build l'application"
    Write-Host "${Green}  test${Reset}             - Lance les tests"
    Write-Host "${Green}  test-coverage${Reset}    - Lance les tests avec coverage"
    Write-Host "${Green}  db-setup${Reset}         - Configure la base de données"
    Write-Host "${Green}  docker-dev-up${Reset}    - Lance tous les services en mode développement"
    Write-Host "${Green}  docker-dev-down${Reset}  - Arrête les services de développement"
    Write-Host "${Green}  docker-prod-up${Reset}   - Lance tous les services en mode production"
    Write-Host "${Green}  monitoring-up${Reset}    - Lance le monitoring"
    Write-Host "${Green}  clean${Reset}            - Nettoie les containers et volumes Docker"
    Write-Host "${Green}  lint${Reset}             - Lance le linting"
    Write-Host "${Green}  type-check${Reset}       - Vérifie les types TypeScript"
}

function Install-Dependencies {
    Write-Host "${Yellow}📦 Installation des dépendances...${Reset}"
    yarn install
}

function Start-Dev {
    Write-Host "${Yellow}🚀 Lancement du développement...${Reset}"
    yarn dev
}

function Start-DevDocker {
    Write-Host "${Yellow}🐳 Lancement du développement avec Docker...${Reset}"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    Write-Host "${Green}🚀 Environnement de développement lancé sur http://localhost:3000${Reset}"
}

function Build-App {
    Write-Host "${Yellow}🔨 Build de l'application...${Reset}"
    npm run build
}

function Run-Tests {
    Write-Host "${Yellow}🧪 Lancement des tests...${Reset}"
    npm test
}

function Run-TestsCoverage {
    Write-Host "${Yellow}📊 Lancement des tests avec coverage...${Reset}"
    npm run test:coverage
}

function Setup-Database {
    Write-Host "${Yellow}🗄️ Configuration de la base de données...${Reset}"
    npm run db:generate
    npm run db:migrate
}

function Docker-Dev-Up {
    Write-Host "${Yellow}🐳 Lancement des services de développement...${Reset}"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
}

function Docker-Dev-Down {
    Write-Host "${Yellow}🛑 Arrêt des services de développement...${Reset}"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
}

function Docker-Prod-Up {
    Write-Host "${Yellow}🚀 Lancement des services de production...${Reset}"
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
}

function Monitoring-Up {
    Write-Host "${Yellow}📊 Lancement du monitoring...${Reset}"
    docker-compose -f docker-compose.monitoring.yml up -d
    Write-Host "${Green}📊 Monitoring lancé :${Reset}"
    Write-Host "${Blue}  - Prometheus: http://localhost:9090${Reset}"
    Write-Host "${Blue}  - Grafana: http://localhost:3001${Reset}"
}

function Clean-Docker {
    Write-Host "${Yellow}🧹 Nettoyage des containers et volumes...${Reset}"
    docker-compose down -v --remove-orphans
    docker system prune -f
}

function Run-Lint {
    Write-Host "${Yellow}🔍 Lancement du linting...${Reset}"
    npm run lint
}

function Check-Types {
    Write-Host "${Yellow}🔍 Vérification des types TypeScript...${Reset}"
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
        Write-Host "${Red}❌ Action inconnue: $Action${Reset}"
        Show-Help 
    }
}
