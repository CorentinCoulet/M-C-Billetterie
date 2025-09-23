#!/bin/bash
#
# Cache Warm-up and Management Script
# Initializes and manages the Redis cache for production
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔥 Cache Management Script${NC}"

NAMESPACE=${NAMESPACE:-billetterie}
REDIS_POD=""

# Get Redis pod
get_redis_pod() {
    REDIS_POD=$(kubectl get pods -l app=redis -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$REDIS_POD" ]; then
        echo -e "${RED}❌ Redis pod not found in namespace $NAMESPACE${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Found Redis pod: $REDIS_POD${NC}"
}

# Test Redis connection
test_redis() {
    echo -e "${YELLOW}🔍 Testing Redis connection...${NC}"
    
    if kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis is responding${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        return 1
    fi
}

# Get Redis info
redis_info() {
    echo -e "${BLUE}📊 Redis Information:${NC}"
    
    # Memory info
    MEMORY=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r\n')
    KEYS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli dbsize)
    CONNECTIONS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli info clients | grep "connected_clients" | cut -d: -f2 | tr -d '\r\n')
    
    echo -e "  Memory usage: $MEMORY"
    echo -e "  Total keys: $KEYS"
    echo -e "  Connections: $CONNECTIONS"
    
    # Show key patterns
    echo -e "\n${BLUE}🔑 Cache Key Patterns:${NC}"
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli --scan --pattern "billetterie:*" | head -10 | while read key; do
        TTL=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli ttl "$key" 2>/dev/null || echo "unknown")
        echo -e "  $key (TTL: ${TTL}s)"
    done
}

# Warm up cache
warm_up_cache() {
    echo -e "${YELLOW}🔥 Warming up application cache...${NC}"
    
    # Get application pod
    APP_POD=$(kubectl get pods -l app=billetterie -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$APP_POD" ]; then
        echo -e "${RED}❌ Application pod not found${NC}"
        return 1
    fi
    
    # Call cache warm-up endpoint
    echo -e "  Calling cache warm-up API..."
    kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/cache/warmup || {
        echo -e "${YELLOW}⚠️  Cache warm-up API not available, trying manual warm-up${NC}"
        
        # Manual warm-up by calling popular endpoints
        echo -e "  Warming up events cache..."
        kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/events?limit=20 > /dev/null
        
        echo -e "  Warming up popular events..."
        kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:3000/api/events/popular > /dev/null
        
        echo -e "  Cache manual warm-up completed"
    }
    
    echo -e "${GREEN}✅ Cache warm-up completed${NC}"
}

# Clear cache
clear_cache() {
    echo -e "${YELLOW}🧹 Clearing cache...${NC}"
    
    read -p "Are you sure you want to clear all cache? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli flushdb
        echo -e "${GREEN}✅ Cache cleared successfully${NC}"
    else
        echo -e "${YELLOW}Cache clear cancelled${NC}"
    fi
}

# Clear specific pattern
clear_pattern() {
    local pattern=$1
    if [ -z "$pattern" ]; then
        read -p "Enter cache pattern to clear (e.g., 'billetterie:*:events:*'): " pattern
    fi
    
    if [ -z "$pattern" ]; then
        echo -e "${RED}❌ No pattern provided${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🧹 Clearing cache pattern: $pattern${NC}"
    
    # Get matching keys and delete them
    KEYS=$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli --scan --pattern "$pattern")
    if [ -n "$KEYS" ]; then
        echo "$KEYS" | while read key; do
            kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli del "$key" > /dev/null
        done
        echo -e "${GREEN}✅ Pattern '$pattern' cleared${NC}"
    else
        echo -e "${YELLOW}⚠️  No keys found matching pattern '$pattern'${NC}"
    fi
}

# Monitor cache
monitor_cache() {
    echo -e "${BLUE}📈 Monitoring cache (Press Ctrl+C to stop)...${NC}"
    
    while true; do
        clear
        echo -e "${BLUE}=== Cache Monitor $(date) ===${NC}"
        
        redis_info
        
        # Show recent activity
        echo -e "\n${BLUE}🔄 Recent Activity:${NC}"
        kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli monitor | head -5 &
        MONITOR_PID=$!
        sleep 3
        kill $MONITOR_PID 2>/dev/null || true
        
        sleep 5
    done
}

# Backup cache
backup_cache() {
    echo -e "${YELLOW}💾 Backing up Redis data...${NC}"
    
    BACKUP_FILE="redis_backup_$(date +%Y%m%d_%H%M%S).rdb"
    
    # Create backup
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli bgsave
    
    # Wait for backup to complete
    echo -e "  Waiting for backup to complete..."
    while kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli lastsave | grep -q "$(kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli lastsave)"; do
        sleep 1
    done
    
    # Copy backup file
    kubectl cp $NAMESPACE/$REDIS_POD:/data/dump.rdb ./$BACKUP_FILE
    
    if [ -f "./$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Backup saved as $BACKUP_FILE${NC}"
        ls -lh $BACKUP_FILE
    else
        echo -e "${RED}❌ Backup failed${NC}"
        return 1
    fi
}

# Set cache configuration
configure_cache() {
    echo -e "${YELLOW}⚙️  Configuring Redis cache settings...${NC}"
    
    # Set memory policy
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli config set maxmemory-policy allkeys-lru
    echo -e "  ✅ Set memory policy to allkeys-lru"
    
    # Set memory limit (256MB)
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli config set maxmemory 268435456
    echo -e "  ✅ Set memory limit to 256MB"
    
    # Enable keyspace notifications
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli config set notify-keyspace-events Ex
    echo -e "  ✅ Enabled keyspace notifications for expired keys"
    
    # Set save policy for persistence
    kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli config set save "900 1 300 10 60 10000"
    echo -e "  ✅ Configured auto-save policy"
    
    echo -e "${GREEN}✅ Redis configuration updated${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}Cache Management Commands:${NC}"
    echo -e "  ${GREEN}info${NC}     - Show Redis information and statistics"
    echo -e "  ${GREEN}test${NC}     - Test Redis connection"
    echo -e "  ${GREEN}warmup${NC}   - Warm up application cache"
    echo -e "  ${GREEN}clear${NC}    - Clear all cache"
    echo -e "  ${GREEN}clear-pattern${NC} - Clear cache by pattern"
    echo -e "  ${GREEN}monitor${NC}  - Monitor cache in real-time"
    echo -e "  ${GREEN}backup${NC}   - Create Redis backup"
    echo -e "  ${GREEN}config${NC}   - Configure Redis settings"
    echo -e "  ${GREEN}help${NC}     - Show this help"
    echo -e ""
    echo -e "${YELLOW}Usage: $0 [command]${NC}"
    echo -e "If no command is provided, interactive mode will start."
}

# Interactive mode
interactive_mode() {
    echo -e "${BLUE}🎛️  Interactive Cache Management${NC}"
    echo -e "Choose an option:"
    echo -e "  1) Show cache info"
    echo -e "  2) Test connection"
    echo -e "  3) Warm up cache"
    echo -e "  4) Clear all cache"
    echo -e "  5) Clear cache pattern"
    echo -e "  6) Monitor cache"
    echo -e "  7) Backup cache"
    echo -e "  8) Configure cache"
    echo -e "  9) Exit"
    
    read -p "Enter choice [1-9]: " choice
    
    case $choice in
        1) redis_info ;;
        2) test_redis ;;
        3) warm_up_cache ;;
        4) clear_cache ;;
        5) clear_pattern ;;
        6) monitor_cache ;;
        7) backup_cache ;;
        8) configure_cache ;;
        9) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Main script
main() {
    # Get Redis pod
    if ! get_redis_pod; then
        exit 1
    fi
    
    # Handle command line arguments
    case "${1:-}" in
        "info")
            redis_info
            ;;
        "test")
            test_redis
            ;;
        "warmup")
            warm_up_cache
            ;;
        "clear")
            clear_cache
            ;;
        "clear-pattern")
            clear_pattern "$2"
            ;;
        "monitor")
            monitor_cache
            ;;
        "backup")
            backup_cache
            ;;
        "config")
            configure_cache
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            interactive_mode
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
