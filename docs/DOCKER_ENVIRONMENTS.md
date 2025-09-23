# 🐳 Docker Environments Management

This project supports **parallel independent environments** for development and production testing.

## 📋 Available Environments

| Environment | Application | PostgreSQL | Redis | Network |
|-------------|-------------|------------|-------|---------|
| **Development** | `localhost:3001` | `localhost:5432` | `localhost:6379` | `billetterie-dev-network` |
| **Production** | `localhost:3002` | `localhost:5433` | `localhost:6380` | `billetterie-prod-network` |

## 🚀 Quick Start Commands

### Using Docker Compose directly

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up -d

# Production environment  
docker-compose -f docker-compose.prod.local.yml up -d

# Both environments in parallel
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.prod.local.yml up -d
```

### Using PowerShell Scripts (Recommended)

```powershell
# Load the management script
. .\scripts-docker-parallel.ps1

# Start individual environments
Start-DevEnvironment      # Development only
Start-ProdEnvironment     # Production only

# Start both environments
Start-BothEnvironments    # Both in parallel

# Stop environments
Stop-DevEnvironment
Stop-ProdEnvironment  
Stop-BothEnvironments

# Monitoring
Show-Status              # Containers status
Show-DevLogs            # Development logs
Show-ProdLogs           # Production logs

# Maintenance
Rebuild-DevEnvironment   # Rebuild dev from scratch
Rebuild-ProdEnvironment  # Rebuild prod from scratch
```

## 🏗️ Architecture

### Development Environment
- **Hot reload** enabled with volume mounting
- **Source code mounting** for instant changes
- **Debug port** 9229 exposed
- **Development database** with relaxed settings
- **Optimized for development** workflow

### Production Environment
- **Optimized build** using multi-stage Dockerfile
- **Production-grade PostgreSQL** settings
- **Redis with memory limits** and persistence
- **Security configurations** applied
- **Performance optimizations** enabled

## 📁 Files Structure

```
├── docker-compose.dev.yml           # Development environment
├── docker-compose.prod.local.yml    # Production environment (local testing)
├── docker-compose.prod.yml          # Production environment (full with SSL/monitoring)
├── .env                             # Development environment variables
├── .env.prod.local                  # Production environment variables (local)
├── .env.production                  # Production environment variables (full)
├── scripts-docker-parallel.ps1     # PowerShell management scripts
└── docker/
    ├── Dockerfile.dev               # Development Dockerfile
    └── Dockerfile.next              # Production Dockerfile
```

## 🔧 Environment Variables

### Development (.env)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres123@postgres-dev:5432/billetterie
REDIS_URL=redis://:password@redis-dev:6379
```

### Production (.env.prod.local)
```bash
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://postgres:postgres123@postgres-prod:5432/billetterie
REDIS_URL=redis://:password@redis-prod:6379
```

## 🔍 Containers Overview

| Container Name | Service | Environment | Port Mapping |
|----------------|---------|-------------|--------------|
| `billetterie-app-dev` | Next.js App | Development | `3001:3000` |
| `postgres-dev` | PostgreSQL | Development | `5432:5432` |
| `redis-dev` | Redis | Development | `6379:6379` |
| `billetterie-app-prod` | Next.js App | Production | `3002:3000` |
| `postgres-prod` | PostgreSQL | Production | `5433:5432` |
| `redis-prod` | Redis | Production | `6380:6379` |

## 🛠️ Troubleshooting

### Port Conflicts
If you encounter port conflicts, check what's using the ports:
```bash
netstat -ano | findstr :3001
netstat -ano | findstr :3002
```

### Container Issues
```bash
# Check containers status
docker ps -a

# View logs
docker logs billetterie-app-dev
docker logs billetterie-app-prod

# Restart specific container
docker restart billetterie-app-dev
```

### Database Issues
```bash
# Connect to development database
docker exec -it postgres-dev psql -U postgres -d billetterie

# Connect to production database  
docker exec -it postgres-prod psql -U postgres -d billetterie
```

### Complete Reset
```bash
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.prod.local.yml down -v

# Rebuild from scratch
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.prod.local.yml build --no-cache
```

## 📊 Monitoring

### Health Checks
Both environments include health checks for:
- PostgreSQL: `pg_isready` command
- Redis: `redis-cli ping` command  
- Next.js: HTTP endpoint check (production only)

### Resource Usage
```bash
# Monitor resource usage
docker stats

# Monitor specific containers
docker stats billetterie-app-dev billetterie-app-prod
```

## 🎯 Use Cases

### Development Workflow
1. Start development environment: `Start-DevEnvironment`
2. Code changes are automatically reflected (hot reload)
3. Debug using port 9229 if needed
4. Access at `http://localhost:3001`

### Production Testing
1. Start production environment: `Start-ProdEnvironment`  
2. Test production build and optimizations
3. Verify production database settings
4. Access at `http://localhost:3002`

### Comparison Testing
1. Start both environments: `Start-BothEnvironments`
2. Compare behavior between development and production
3. Test feature parity between environments
4. Performance comparison

## 🔐 Security Notes

- Production environment uses optimized PostgreSQL settings
- Redis is configured with password authentication
- Production build includes security hardening
- Separate networks prevent cross-environment contamination

## 📈 Performance

### Development
- Optimized for development speed
- Volume mounting for instant changes
- Minimal caching for immediate updates

### Production  
- Multi-stage Docker build for smaller images
- Production PostgreSQL configurations
- Redis memory limits and persistence
- Optimized Next.js build output