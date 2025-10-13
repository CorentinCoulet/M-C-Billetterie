#!/bin/bash

# ====================================================================================
# DOCKER MANAGER - Billetterie (Linux/Production)
# ====================================================================================
# Usage: ./docker-manager.sh <action> [options]
# ====================================================================================

set -e

# ====================================================================================
# CONFIGURATION
# ====================================================================================

readonly NETWORK_NAME="billetterie-network"
readonly LOG_DIR="./logs"
readonly BACKUP_DIR="./backups"

# Ports
readonly PROD_APP_PORT=3000
readonly POSTGRESQL_PORT=5432
readonly REDIS_PORT=6379
readonly GRAFANA_PORT=3002
readonly PROMETHEUS_PORT=9090

# Conteneurs
readonly PROD_APP="billetterie-app"
readonly POSTGRESQL="postgres"
readonly REDIS="redis"

# Fichiers compose
readonly COMPOSE_BASE="docker-compose.yml"
readonly COMPOSE_PROD="docker-compose.prod.yml"
readonly COMPOSE_MONITORING="docker-compose.monitoring.yml"

# Couleurs
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;90m'
readonly NC='\033[0m' # No Color

# ====================================================================================
# FONCTIONS UTILITAIRES
# ====================================================================================

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${GRAY}[DEBUG]${NC} $1"
    fi
}

show_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     🎫 Billetterie - Docker Manager (Linux/Prod)    ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    local all_ok=true
    
    # Vérifier Docker
    if command -v docker &> /dev/null; then
        log_success "Docker installé: $(docker --version)"
    else
        log_error "Docker n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose installé: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        log_success "Docker Compose (plugin) installé"
    else
        log_error "Docker Compose n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier que Docker daemon est actif
    if docker ps &> /dev/null; then
        log_success "Docker daemon actif"
    else
        log_error "Docker daemon n'est pas accessible"
        all_ok=false
    fi
    
    if [[ "${all_ok}" == "false" ]]; then
        log_error "Certains prérequis sont manquants"
        exit 1
    fi
}

ensure_network() {
    if docker network ls | grep -q "${NETWORK_NAME}"; then
        log_debug "Réseau ${NETWORK_NAME} déjà existant"
    else
        log_info "Création du réseau Docker: ${NETWORK_NAME}"
        docker network create "${NETWORK_NAME}"
        log_success "Réseau créé"
    fi
}

wait_for_container() {
    local container_name=$1
    local timeout=${2:-60}
    local elapsed=0
    local interval=2
    
    log_info "Attente du démarrage de ${container_name}..."
    
    while [[ ${elapsed} -lt ${timeout} ]]; do
        local status=$(docker inspect --format='{{.State.Status}}' "${container_name}" 2>/dev/null || echo "not_found")
        
        if [[ "${status}" == "running" ]]; then
            local health=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null || echo "")
            
            if [[ "${health}" == "healthy" || -z "${health}" ]]; then
                log_success "${container_name} est prêt"
                return 0
            elif [[ "${health}" == "unhealthy" ]]; then
                log_warning "${container_name} est unhealthy"
            fi
        elif [[ "${status}" == "exited" ]]; then
            log_error "${container_name} a quitté de façon inattendue"
            return 1
        fi
        
        sleep ${interval}
        elapsed=$((elapsed + interval))
    done
    
    log_error "${container_name} n'a pas démarré dans les temps (${timeout}s)"
    return 1
}

# ====================================================================================
# FONCTIONS PRINCIPALES
# ====================================================================================

show_help() {
    echo "USAGE:"
    echo "  ./docker-manager.sh <action> [options]"
    echo ""
    echo -e "${GREEN}ENVIRONNEMENTS:${NC}"
    echo "  prod                   🏭 Production complète"
    echo "  prod-monitoring        📊 Production + Monitoring"
    echo "  prod-full              🔧 Production + Monitoring + Outils"
    echo ""
    echo -e "${GREEN}GESTION:${NC}"
    echo "  status                 Voir le statut des conteneurs"
    echo "  health                 Vérifier la santé des services"
    echo "  metrics                Métriques de performance"
    echo "  logs [--follow]        Voir les logs"
    echo "  restart                Redémarrer les conteneurs"
    echo ""
    echo -e "${RED}ARRÊT:${NC}"
    echo "  down                   Arrêter l'environnement"
    echo "  down-v                 Down + Supprimer les volumes"
    echo "  down-full              Down + Nettoyage complet Docker"
    echo ""
    echo -e "${GREEN}TESTS:${NC}"
    echo "  test-pg                Tester PostgreSQL"
    echo "  test-redis             Tester Redis"
    echo "  test-all               Tester tous les services"
    echo ""
    echo -e "${GREEN}UTILITAIRES:${NC}"
    echo "  ports                  Afficher les ports utilisés"
    echo "  seed                   Exécuter le seed (données de test)"
    echo "  backup                 Backup de la base de données"
    echo "  restore <file>         Restaurer la base de données"
    echo "  clean-volumes          Nettoyer les volumes Docker"
    echo "  prune                  Nettoyage complet Docker"
    echo ""
    echo -e "${YELLOW}OPTIONS:${NC}"
    echo "  --build                Rebuild les images avant de démarrer"
    echo "  --follow               Suivre les logs en temps réel"
    echo "  --verbose              Mode verbeux avec détails"
    echo "  --monitoring           Inclure le monitoring"
    echo "  --skip-seed            Ne pas exécuter le seed au démarrage"
    echo ""
    echo -e "${CYAN}EXEMPLES:${NC}"
    echo "  ./docker-manager.sh prod"
    echo "  ./docker-manager.sh prod-monitoring --build"
    echo "  ./docker-manager.sh logs --follow"
    echo "  ./docker-manager.sh backup"
    echo "  ./docker-manager.sh down"
    echo ""
}

start_prod() {
    log_info "🏭 Démarrage de l'environnement PRODUCTION..."
    echo ""
    
    check_prerequisites
    ensure_network
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD}"
    
    if [[ "${BUILD}" == "true" ]]; then
        log_info "Build des images..."
        docker-compose ${compose_files} build
    fi
    
    log_info "Démarrage des conteneurs..."
    docker-compose ${compose_files} up -d
    
    # Attendre les services critiques
    wait_for_container "${POSTGRESQL}"
    wait_for_container "${REDIS}"
    
    log_success "Environnement PROD démarré avec succès!"
    echo ""
    echo -e "${CYAN}📦 Services disponibles:${NC}"
    echo "   ✓ Application:   http://localhost:${PROD_APP_PORT}"
    echo ""
}

start_prod_monitoring() {
    log_info "📊 Démarrage de PROD + Monitoring..."
    echo ""
    
    check_prerequisites
    ensure_network
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD} -f ${COMPOSE_MONITORING}"
    
    if [[ "${BUILD}" == "true" ]]; then
        log_info "Build des images..."
        docker-compose ${compose_files} build
    fi
    
    log_info "Démarrage des conteneurs..."
    docker-compose ${compose_files} up -d
    
    wait_for_container "${POSTGRESQL}"
    wait_for_container "${REDIS}"
    
    log_success "PROD + Monitoring démarré avec succès!"
    echo ""
    echo -e "${CYAN}📦 Services disponibles:${NC}"
    echo "   ✓ Application:   http://localhost:${PROD_APP_PORT}"
    echo "   ✓ Grafana:       http://localhost:${GRAFANA_PORT}"
    echo "   ✓ Prometheus:    http://localhost:${PROMETHEUS_PORT}"
    echo ""
}

start_prod_full() {
    log_info "🔧 Démarrage de PROD complet..."
    echo ""
    
    check_prerequisites
    ensure_network
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD} -f ${COMPOSE_MONITORING}"
    
    if [[ "${BUILD}" == "true" ]]; then
        log_info "Build des images..."
        docker-compose ${compose_files} build
    fi
    
    log_info "Démarrage de l'environnement complet..."
    docker-compose ${compose_files} up -d
    docker-compose -f ${COMPOSE_BASE} -f ${COMPOSE_PROD} --profile tools up -d
    
    log_success "PROD complet démarré avec succès!"
    echo ""
    log_success "Tous les services sont maintenant actifs"
    echo ""
}

show_status() {
    log_info "Statut des conteneurs..."
    echo ""
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    local running=$(docker ps -q | wc -l)
    local stopped=$(docker ps -aq -f status=exited | wc -l)
    
    echo -e "${CYAN}Résumé:${NC} ${running} conteneurs actifs, ${stopped} arrêtés"
    echo ""
}

show_logs() {
    log_info "Logs de l'environnement PROD..."
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD}"
    if [[ "${WITH_MONITORING}" == "true" ]]; then
        compose_files="${compose_files} -f ${COMPOSE_MONITORING}"
    fi
    
    if [[ "${FOLLOW}" == "true" ]]; then
        docker-compose ${compose_files} logs -f
    else
        docker-compose ${compose_files} logs --tail=50
    fi
}

invoke_down() {
    log_warning "Arrêt de l'environnement PROD..."
    echo ""
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD}"
    if [[ "${WITH_MONITORING}" == "true" ]]; then
        compose_files="${compose_files} -f ${COMPOSE_MONITORING}"
    fi
    
    docker-compose ${compose_files} down
    
    log_success "Environnement arrêté avec succès"
    echo ""
}

invoke_down_with_volumes() {
    log_warning "Arrêt avec suppression des volumes..."
    echo ""
    echo -e "${RED}⚠ ATTENTION: Cette opération supprimera les volumes (données des bases de données)!${NC}"
    echo ""
    read -p "Êtes-vous sûr? Tapez 'OUI' pour confirmer: " confirm
    
    if [[ "${confirm}" != "OUI" ]]; then
        log_warning "Opération annulée"
        return
    fi
    
    local compose_files="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD}"
    if [[ "${WITH_MONITORING}" == "true" ]]; then
        compose_files="${compose_files} -f ${COMPOSE_MONITORING}"
    fi
    
    docker-compose ${compose_files} down -v --remove-orphans
    
    log_success "Environnement et volumes supprimés avec succès"
    echo ""
}

invoke_down_full() {
    log_warning "Arrêt complet avec nettoyage Docker..."
    echo ""
    echo -e "${RED}⚠ ATTENTION: Cette opération va:${NC}"
    echo "  1. Arrêter tous les conteneurs"
    echo "  2. Supprimer tous les volumes"
    echo "  3. Supprimer les conteneurs orphelins"
    echo "  4. Nettoyer les images, réseaux et cache Docker"
    echo ""
    read -p "Êtes-vous sûr? Tapez 'OUI' pour confirmer: " confirm
    
    if [[ "${confirm}" != "OUI" ]]; then
        log_warning "Opération annulée"
        return
    fi
    
    echo ""
    log_info "Étape 1/4: Arrêt des conteneurs avec suppression des volumes..."
    docker-compose -f ${COMPOSE_BASE} -f ${COMPOSE_PROD} down -v --remove-orphans 2>/dev/null || true
    docker-compose -f ${COMPOSE_MONITORING} down -v --remove-orphans 2>/dev/null || true
    log_success "  Conteneurs et volumes supprimés"
    
    echo ""
    log_info "Étape 2/4: Nettoyage des images non utilisées..."
    docker image prune -af &>/dev/null
    log_success "  Images nettoyées"
    
    echo ""
    log_info "Étape 3/4: Nettoyage des réseaux..."
    docker network prune -f &>/dev/null
    log_success "  Réseaux nettoyés"
    
    echo ""
    log_info "Étape 4/4: Nettoyage du cache de build..."
    docker builder prune -af &>/dev/null
    log_success "  Cache de build nettoyé"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  Nettoyage complet terminé!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}Espace disque Docker:${NC}"
    docker system df
    echo ""
}

restart_containers() {
    log_info "Redémarrage des conteneurs..."
    
    docker-compose -f ${COMPOSE_BASE} -f ${COMPOSE_PROD} restart
    
    log_success "Conteneurs redémarrés avec succès"
}

show_ports() {
    echo ""
    echo -e "${CYAN}  PORTS UTILISÉS (PRODUCTION)${NC}"
    echo "============================"
    echo ""
    echo -e "${YELLOW}APPLICATION:${NC}"
    echo "  Next.js Prod:      http://localhost:${PROD_APP_PORT}"
    echo ""
    echo -e "${YELLOW}BASES DE DONNÉES:${NC}"
    echo "  PostgreSQL Prod:   localhost:${POSTGRESQL_PORT}"
    echo "  Redis Prod:        localhost:${REDIS_PORT}"
    echo ""
    echo -e "${YELLOW}MONITORING:${NC}"
    echo "  Grafana:           http://localhost:${GRAFANA_PORT}"
    echo "  Prometheus:        http://localhost:${PROMETHEUS_PORT}"
    echo ""
}

test_postgresql() {
    log_info "Test de connexion PostgreSQL..."
    echo ""
    
    local container="${POSTGRESQL}"
    if docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        if docker exec "${container}" pg_isready -h localhost -U postgres &>/dev/null; then
            log_success "PostgreSQL Prod: OK"
        else
            log_warning "PostgreSQL Prod: Conteneur actif mais service non prêt"
        fi
    else
        log_error "PostgreSQL Prod: Non démarré"
    fi
    echo ""
}

test_redis() {
    log_info "Test de connexion Redis..."
    echo ""
    
    local container="${REDIS}"
    if docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        local result=$(docker exec "${container}" redis-cli -a password PING 2>/dev/null || echo "")
        if [[ "${result}" == "PONG" ]]; then
            log_success "Redis Prod: OK"
        else
            log_warning "Redis Prod: Conteneur actif mais service non prêt"
        fi
    else
        log_error "Redis Prod: Non démarré"
    fi
    echo ""
}

test_all() {
    log_info "Test complet de tous les services..."
    echo ""
    
    test_postgresql
    test_redis
    
    # Test application
    log_info "Test de l'application..."
    echo ""
    
    local container="${PROD_APP}"
    if docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PROD_APP_PORT}" | grep -q "200\|301\|302"; then
            log_success "Application Prod: OK"
        else
            log_warning "Application Prod: Conteneur actif mais HTTP non disponible"
        fi
    else
        log_error "Application Prod: Non démarrée"
    fi
    echo ""
}

show_metrics() {
    log_info "Métriques des conteneurs en cours d'exécution..."
    echo ""
    
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo ""
}

backup_database() {
    log_info "Création d'un backup de la base de données..."
    
    mkdir -p "${BACKUP_DIR}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backup_prod_${timestamp}.sql"
    local backup_path="${BACKUP_DIR}/${backup_file}"
    
    local container="${POSTGRESQL}"
    
    if ! docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        log_error "Le conteneur ${container} n'est pas actif"
        return 1
    fi
    
    log_info "Backup depuis le conteneur: ${container}"
    docker exec "${container}" pg_dump -U postgres billetterie > "${backup_path}"
    
    if [[ -f "${backup_path}" ]]; then
        local size=$(du -h "${backup_path}" | cut -f1)
        log_success "Backup créé: ${backup_file} (${size})"
        
        # Compression
        if command -v gzip &>/dev/null; then
            gzip "${backup_path}"
            local gzip_size=$(du -h "${backup_path}.gz" | cut -f1)
            log_success "Backup compressé: ${backup_file}.gz (${gzip_size})"
            echo ""
            echo -e "${GREEN}Backup sauvegardé dans: ${BACKUP_DIR}/${backup_file}.gz${NC}"
        else
            echo ""
            echo -e "${GREEN}Backup sauvegardé dans: ${backup_path}${NC}"
        fi
        echo ""
    else
        log_error "Erreur lors du backup"
    fi
}

restore_database() {
    local backup_file=$1
    
    if [[ -z "${backup_file}" ]]; then
        log_error "Veuillez spécifier un fichier de backup"
        log_info "Usage: ./docker-manager.sh restore <fichier>"
        return 1
    fi
    
    local backup_path="${BACKUP_DIR}/${backup_file}"
    
    if [[ ! -f "${backup_path}" ]]; then
        log_error "Fichier de backup introuvable: ${backup_path}"
        return 1
    fi
    
    log_warning "ATTENTION: Cette opération va ÉCRASER la base de données actuelle!"
    read -p "Continuer? Tapez 'OUI' pour confirmer: " confirm
    
    if [[ "${confirm}" != "OUI" ]]; then
        log_warning "Restauration annulée"
        return
    fi
    
    local container="${POSTGRESQL}"
    
    if ! docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        log_error "Le conteneur ${container} n'est pas actif"
        return 1
    fi
    
    log_info "Restauration en cours..."
    
    # Décompresser si nécessaire
    local sql_file="${backup_path}"
    if [[ "${backup_path}" == *.gz ]]; then
        log_info "Décompression du backup..."
        gunzip -k "${backup_path}"
        sql_file="${backup_path%.gz}"
    fi
    
    docker cp "${sql_file}" "${container}:/tmp/restore.sql"
    docker exec "${container}" psql -U postgres -d billetterie -f /tmp/restore.sql &>/dev/null
    
    if [[ $? -eq 0 ]]; then
        log_success "Base de données restaurée avec succès!"
        docker exec "${container}" rm /tmp/restore.sql &>/dev/null
    else
        log_error "Erreur lors de la restauration"
    fi
    
    # Nettoyage
    if [[ "${backup_path}" == *.gz && -f "${sql_file}" ]]; then
        rm "${sql_file}"
    fi
}

invoke_seed() {
    log_info "Exécution du seed de la base de données..."
    echo ""
    
    local container="${PROD_APP}"
    
    if ! docker ps --filter "name=${container}" --filter "status=running" -q &>/dev/null; then
        log_error "Le conteneur ${container} n'est pas actif"
        log_info "Démarrez l'environnement d'abord avec: ./docker-manager.sh prod"
        return 1
    fi
    
    log_info "Application des migrations Prisma..."
    docker exec "${container}" yarn prisma migrate deploy &>/dev/null
    log_success "Migrations appliquées"
    
    echo ""
    log_info "Exécution du seed..."
    if docker exec "${container}" yarn db:seed &>/dev/null; then
        log_success "Seed exécuté avec succès!"
        echo ""
        echo -e "${CYAN}Compte admin: admin@demo.com / admin123${NC}"
        echo ""
    else
        log_error "Erreur lors du seed"
    fi
}

clean_volumes() {
    log_warning "Nettoyage des volumes Docker..."
    echo ""
    echo -e "${RED}⚠ ATTENTION: Cette opération supprimera TOUTES les données des volumes!${NC}"
    echo ""
    read -p "Êtes-vous sûr? Tapez 'OUI' pour confirmer: " confirm
    
    if [[ "${confirm}" == "OUI" ]]; then
        docker-compose -f ${COMPOSE_BASE} -f ${COMPOSE_PROD} down -v 2>/dev/null || true
        log_success "Volumes nettoyés avec succès"
    else
        log_warning "Opération annulée"
    fi
}

invoke_prune() {
    log_warning "Nettoyage complet de Docker..."
    echo ""
    echo -e "${RED}Cette opération va supprimer:${NC}"
    echo "  - Tous les conteneurs arrêtés"
    echo "  - Tous les réseaux non utilisés"
    echo "  - Toutes les images non utilisées"
    echo "  - Tout le cache de build"
    echo ""
    read -p "Continuer? Tapez 'OUI' pour confirmer: " confirm
    
    if [[ "${confirm}" == "OUI" ]]; then
        log_info "Nettoyage en cours..."
        docker system prune -af --volumes
        log_success "Nettoyage Docker terminé"
        echo ""
        docker system df
        echo ""
    else
        log_warning "Opération annulée"
    fi
}

# ====================================================================================
# MAIN
# ====================================================================================

# Parse arguments
BUILD=false
FOLLOW=false
VERBOSE=false
WITH_MONITORING=false
SKIP_SEED=false
ACTION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD=true
            shift
            ;;
        --follow)
            FOLLOW=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --monitoring)
            WITH_MONITORING=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        *)
            if [[ -z "${ACTION}" ]]; then
                ACTION=$1
            fi
            shift
            ;;
    esac
done

# Display banner
show_banner

# Execute action
case "${ACTION}" in
    prod)
        start_prod
        ;;
    prod-monitoring)
        start_prod_monitoring
        ;;
    prod-full)
        start_prod_full
        ;;
    status)
        show_status
        ;;
    health)
        test_all
        ;;
    metrics)
        show_metrics
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_containers
        ;;
    down)
        invoke_down
        ;;
    down-v)
        invoke_down_with_volumes
        ;;
    down-full)
        invoke_down_full
        ;;
    test-pg)
        test_postgresql
        ;;
    test-redis)
        test_redis
        ;;
    test-all)
        test_all
        ;;
    ports)
        show_ports
        ;;
    seed)
        invoke_seed
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    clean-volumes)
        clean_volumes
        ;;
    prune)
        invoke_prune
        ;;
    help|"")
        show_help
        ;;
    *)
        log_error "Action inconnue: ${ACTION}"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0
