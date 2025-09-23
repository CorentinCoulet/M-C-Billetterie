# Cache & Performance Documentation

## Overview

The billetterie application now includes a comprehensive caching and monitoring system designed for production use. This system provides:

- **Redis Cache** with memory fallback for high availability
- **Sentry Integration** for error tracking and performance monitoring
- **Advanced Monitoring** with health checks and metrics
- **Production-Ready Infrastructure** with PostgreSQL replication

## Cache System

### Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Application   │───▶│ Cache Service │───▶│ Redis Primary  │
│                 │    │               │    │                 │
│                 │    │   (Fallback)  │    │                 │
│                 │◄───│ Memory Cache  │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

### Features

- **Multi-tier caching**: Redis primary, memory fallback
- **Automatic failover**: Switches to memory cache if Redis fails
- **Cache warming**: Pre-loads frequently accessed data
- **TTL management**: Configurable expiration times
- **Health monitoring**: Real-time cache status

### Cache Keys Structure

```
billetterie:events:{eventId}              # Individual events
billetterie:events:popular:{limit}        # Popular events list
billetterie:events:search:{hash}          # Search results
billetterie:users:{userId}:profile        # User profiles
billetterie:tickets:{ticketId}            # Ticket details
billetterie:config:{key}                  # Configuration data
```

### Configuration

```javascript
// Cache TTL Configuration
const CACHE_TTL = {
  events: 1800,        // 30 minutes
  users: 900,          // 15 minutes
  tickets: 3600,       // 1 hour
  searches: 300,       // 5 minutes
  config: 86400,       // 24 hours
};
```

## Performance Optimizations

### EventService Enhancements

The EventService now includes:

- **@Cached decorator**: Automatic caching of method results
- **Cache warming**: Preloads popular events on startup
- **Smart invalidation**: Updates cache when data changes
- **Batch operations**: Efficient bulk data loading

### Example Usage

```typescript
// Cached event retrieval
const event = await eventService.getEventById(eventId);

// Cache warming
await eventService.warmUpCache();

// Cached search with fallback
const results = await eventService.searchEvents(query, { useCache: true });
```

### Performance Metrics

The system tracks:

- Cache hit/miss ratios
- Response times
- Database query performance
- API endpoint latency
- Business metrics (sales, registrations, etc.)

## Sentry Integration

### Error Tracking

```typescript
// Automatic error capture
try {
  await someOperation();
} catch (error) {
  sentryService.captureException(error, {
    tags: { operation: 'user-action' },
    user: { id: userId },
    extra: { context: 'additional-info' }
  });
}
```

### Performance Monitoring

- **Transaction tracking**: API endpoint performance
- **Database monitoring**: Query performance and errors
- **Cache monitoring**: Hit rates and response times
- **Business metrics**: Revenue, user activity, etc.

### Configuration

```javascript
// sentry.client.config.js
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% in production
  environment: process.env.NODE_ENV,
  ignoreErrors: ['ChunkLoadError', 'Network request failed'],
});
```

## Monitoring & Health Checks

### Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/health` | Overall system health | JSON status |
| `/api/health?format=prometheus` | Prometheus metrics | Text metrics |
| `/api/cache/health` | Cache system status | JSON status |
| `/api/monitoring/sentry` | Sentry integration test | JSON status |

### Health Check Response

```json
{
  "status": "healthy",
  "services": {
    "cache": { "status": "healthy", "message": "Redis connected" },
    "database": { "status": "healthy", "responseTime": 45 },
    "sentry": { "status": "healthy", "enabled": true }
  },
  "performance": {
    "responseTime": 123,
    "uptime": 86400,
    "memory": { "heapUsed": 256, "heapTotal": 512 }
  }
}
```

### Kubernetes Integration

The system includes Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Deployment

### Environment Variables

#### Required
```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://:password@redis:6379"
JWT_SECRET="..."
NEXTAUTH_SECRET="..."
```

#### Optional (Sentry)
```bash
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ORG="your-org"
SENTRY_PROJECT="billetterie"
```

### Deployment Scripts

1. **Complete Deployment**: `./scripts/deploy-production-complete.sh`
2. **Database Only**: `./scripts/deploy-production-database.sh`
3. **Cache Management**: `./scripts/manage-cache.sh`

### Kubernetes Resources

The system deploys:

- **PostgreSQL Master/Slave** with PgBouncer
- **Redis Cache** with persistence
- **Application Pods** with resource limits
- **Monitoring** with Prometheus integration
- **SSL/TLS** with cert-manager

## Cache Management

### Cache Warming

```bash
# Manual cache warming
./scripts/manage-cache.sh warmup

# API endpoint
curl -X POST https://your-domain/api/cache/warmup
```

### Cache Monitoring

```bash
# Real-time monitoring
./scripts/manage-cache.sh monitor

# Cache statistics
./scripts/manage-cache.sh info
```

### Cache Invalidation

```typescript
// Programmatic invalidation
await cache.invalidatePattern('billetterie:events:*');

// Service-level invalidation
await eventService.invalidateEventCache(eventId);
```

## Performance Tuning

### Redis Configuration

```bash
# Memory optimization
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1 300 10 60 10000

# Networking
tcp-keepalive 300
timeout 0
```

### Application Optimization

- **Connection pooling**: PgBouncer for database connections
- **Memory management**: Automatic cache cleanup
- **Request optimization**: CDN-friendly cache headers
- **Database indexing**: Optimized queries with proper indexes

## Troubleshooting

### Common Issues

1. **Cache Connection Failed**
   ```bash
   kubectl logs -n billetterie deployment/billetterie
   ./scripts/manage-cache.sh test
   ```

2. **High Memory Usage**
   ```bash
   ./scripts/manage-cache.sh info
   # Check memory usage and clear if needed
   ./scripts/manage-cache.sh clear
   ```

3. **Slow Response Times**
   ```bash
   # Check cache hit rates
   curl https://your-domain/api/cache/health
   
   # Monitor performance
   curl https://your-domain/api/health?detailed=true
   ```

### Monitoring Alerts

Set up alerts for:

- Cache miss ratio > 50%
- Response time > 1000ms
- Error rate > 1%
- Memory usage > 80%
- Database connection failures

## Security Considerations

### Cache Security

- **Data encryption**: Redis AUTH password
- **Network isolation**: Private cluster networking
- **Access control**: Kubernetes RBAC
- **Data sanitization**: No sensitive data in cache keys

### Monitoring Security

- **Data filtering**: Sensitive data removed from logs
- **Access control**: Health endpoints behind authentication
- **Audit logging**: All administrative actions logged

## Maintenance

### Regular Tasks

1. **Cache cleanup**: Weekly cache pattern review
2. **Performance review**: Monthly response time analysis
3. **Security updates**: Regular dependency updates
4. **Backup verification**: Daily backup tests

### Scaling Considerations

- **Cache clustering**: Redis Cluster for horizontal scaling
- **Database scaling**: Read replicas for heavy read workloads
- **Application scaling**: Horizontal pod autoscaling
- **CDN integration**: CloudFlare or AWS CloudFront

## API Reference

### Cache API

```typescript
// Cache service methods
cache.get(key: string): Promise<string | null>
cache.set(key: string, value: string, ttl?: number): Promise<void>
cache.del(key: string): Promise<void>
cache.invalidatePattern(pattern: string): Promise<void>
cache.healthCheck(): Promise<HealthStatus>
```

### Monitoring API

```typescript
// Monitoring service methods
monitoring.trackApiPerformance(endpoint, method, operation)
monitoring.trackBusinessEvent(event, data, userId)
monitoring.monitorCachePerformance(operation, key)
monitoring.emergencyAlert(message, details, userId)
```

This comprehensive caching and monitoring system ensures your billetterie application can handle production workloads with excellent performance and reliability.
