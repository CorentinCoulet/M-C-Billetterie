# 🔒 Security Documentation - Billetterie API

## Table of Contents
1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Data Protection](#data-protection)
5. [Network Security](#network-security)
6. [Monitoring & Incident Response](#monitoring--incident-response)
7. [Compliance & Privacy](#compliance--privacy)
8. [Deployment Security](#deployment-security)
9. [Security Checklist](#security-checklist)

## Security Overview

### Security Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │    WAF/CDN      │    │     Client      │
│   (Rate Limit)  │◄──►│  (DDoS, Bot)    │◄──►│   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      API        │    │    Security     │    │   Monitoring    │
│   (Express)     │◄──►│   Middleware    │◄──►│   (Logging)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Database     │    │      Redis      │    │     Storage     │
│  (PostgreSQL)   │    │    (Sessions)   │    │   (Encrypted)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Layers
1. **Perimeter Security**: WAF, DDoS protection, rate limiting
2. **Application Security**: Input validation, authentication, authorization
3. **Data Security**: Encryption at rest and in transit
4. **Infrastructure Security**: Hardened containers, network isolation
5. **Monitoring**: Real-time threat detection and alerting

## Authentication & Authorization

### JWT Implementation
- **Algorithm**: RS256 (RSA with SHA-256)
- **Token Lifetime**: 15 minutes (access), 7 days (refresh)
- **Storage**: HTTPOnly cookies with Secure and SameSite flags
- **Rotation**: Automatic token rotation on refresh

```typescript
// Example secure token configuration
const jwtConfig = {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'billetterie-api',
  audience: 'billetterie-client'
};
```

### Session Management
- **Session Storage**: Redis with encryption
- **Session Timeout**: 30 minutes idle, 8 hours absolute
- **Concurrent Sessions**: Maximum 3 per user
- **Session Validation**: IP and User-Agent binding

### Role-Based Access Control (RBAC)
```typescript
// Role hierarchy
USER < ORGANIZER < ADMIN

// Permission structure
{
  "events": ["read", "create", "update", "delete"],
  "tickets": ["read", "validate", "transfer"],
  "payments": ["create", "refund"],
  "users": ["read", "update", "delete"]
}
```

## Input Validation & Sanitization

### Validation Strategy
1. **Schema Validation**: Zod schemas for all inputs
2. **Type Safety**: TypeScript strict mode
3. **Sanitization**: HTML and SQL injection prevention
4. **Rate Limiting**: Per-endpoint request limits

### Dangerous Pattern Detection
```typescript
// Patterns blocked automatically
const DANGEROUS_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i,  // SQL injection
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,       // XSS
  /(\||&|;|\$\(|\`)/,                           // Command injection
  /\.\.(\/|\\)/,                                // Path traversal
];
```

### File Upload Security
- **Type Validation**: Whitelist of allowed MIME types
- **Size Limits**: Maximum 5MB per file
- **Virus Scanning**: Integration with ClamAV
- **Storage**: Isolated directory with no execution permissions

## Data Protection

### Encryption Standards
- **At Rest**: AES-256-GCM for sensitive data
- **In Transit**: TLS 1.3 with perfect forward secrecy
- **Database**: Column-level encryption for PII
- **Backups**: Encrypted with separate keys

### Personal Data Handling
```sql
-- Example encrypted column
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name_encrypted BYTEA, -- AES-256 encrypted
    phone_encrypted BYTEA, -- AES-256 encrypted
    created_at TIMESTAMP DEFAULT NOW()
);
```

### GDPR Compliance
- **Data Minimization**: Collect only necessary data
- **Retention Policies**: Automatic deletion after 7 years
- **Right to Erasure**: Automated data anonymization
- **Data Portability**: Structured export functionality
- **Consent Management**: Granular permission tracking

## Network Security

### Transport Layer Security
```nginx
# Nginx TLS configuration
ssl_protocols TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### Content Security Policy
```javascript
const csp = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://js.stripe.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:"],
  "connect-src": ["'self'", "https://api.stripe.com"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"]
};
```

### Rate Limiting
```typescript
const rateLimits = {
  // General API
  general: { max: 1000, windowMs: 15 * 60 * 1000 },
  // Authentication endpoints
  auth: { max: 5, windowMs: 15 * 60 * 1000 },
  // Password reset
  passwordReset: { max: 3, windowMs: 60 * 60 * 1000 },
  // Payment endpoints
  payment: { max: 10, windowMs: 60 * 60 * 1000 }
};
```

## Monitoring & Incident Response

### Security Event Types
```typescript
enum SecurityEventType {
  LOGIN_FAILURE = 'login_failure',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  INJECTION_ATTEMPT = 'injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PAYMENT_FRAUD = 'payment_fraud',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt'
}
```

### Alert Thresholds
| Event Type | Threshold | Time Window | Response |
|------------|-----------|-------------|----------|
| Login Failure | 5 attempts | 15 minutes | Block IP |
| Injection Attempt | 1 attempt | 5 minutes | Block IP + Alert |
| Payment Fraud | 1 attempt | 30 minutes | Disable Account |
| Data Breach | 1 attempt | 1 minute | Emergency Alert |

### Incident Response Playbook
1. **Detection**: Automated monitoring triggers alert
2. **Assessment**: Security team evaluates threat level
3. **Containment**: Automatic IP blocking, account suspension
4. **Investigation**: Log analysis, forensic examination
5. **Recovery**: System restoration, security patches
6. **Lessons Learned**: Post-incident review and improvements

## Compliance & Privacy

### GDPR Requirements
- [x] **Article 25**: Privacy by design and by default
- [x] **Article 32**: Security of processing
- [x] **Article 33**: Breach notification (72 hours)
- [x] **Article 35**: Data protection impact assessment
- [x] **Article 37**: Data protection officer designation

### Data Categories
```typescript
interface PersonalData {
  // Identity data
  name: string;           // Encrypted
  email: string;          // Hashed for lookup
  phone?: string;         // Encrypted
  
  // Behavioral data
  loginHistory: LoginAttempt[];
  purchaseHistory: Order[];
  
  // Technical data
  ipAddress: string;      // Anonymized after 30 days
  userAgent: string;      // Anonymized after 30 days
}
```

### Audit Trail
```sql
-- All security events are logged
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    event_hash VARCHAR(64) -- For integrity verification
);
```

## Deployment Security

### Container Security
```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine
RUN adduser -S billetterie -u 1001
USER billetterie
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:3000/health
```

### Environment Security
- **Secrets Management**: Never store secrets in code
- **Environment Isolation**: Separate dev/staging/prod
- **Access Control**: Principle of least privilege
- **Network Segmentation**: VPC with private subnets

### Database Security
```postgresql
-- Database hardening
-- 1. Dedicated user with minimal privileges
CREATE USER billetterie_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE billetterie TO billetterie_app;
GRANT USAGE ON SCHEMA public TO billetterie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO billetterie_app;

-- 2. Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON users FOR ALL TO billetterie_app USING (id = current_user_id());

-- 3. Audit triggers
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS trigger AS $audit$
BEGIN
    INSERT INTO audit_logs (action, resource_type, resource_id, details)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
END;
$audit$ LANGUAGE plpgsql;
```

## Security Checklist

### Pre-Deployment
- [ ] All environment variables secured
- [ ] Database connection uses SSL
- [ ] Redis authentication enabled
- [ ] CSRF protection active
- [ ] Rate limiting configured
- [ ] Security headers implemented
- [ ] Input validation on all endpoints
- [ ] Authentication required for protected routes
- [ ] Audit logging enabled
- [ ] Error handling doesn't leak information
- [ ] Dependencies updated and scanned
- [ ] Static code analysis completed
- [ ] Penetration testing performed

### Runtime Security
- [ ] SSL/TLS certificates valid and auto-renewing
- [ ] Security monitoring active
- [ ] Log rotation configured
- [ ] Backup encryption verified
- [ ] Incident response plan tested
- [ ] Security patches up to date
- [ ] Access logs monitored
- [ ] Unusual activity alerts working

### Periodic Reviews
- [ ] Security audit (quarterly)
- [ ] Penetration testing (annually)
- [ ] Dependency vulnerability scan (weekly)
- [ ] Access control review (monthly)
- [ ] Backup and recovery testing (monthly)
- [ ] Incident response drill (quarterly)

## Security Contact

For security issues or questions:
- **Email**: security@company.com
- **Response Time**: 24 hours for high/critical issues
- **Escalation**: security-urgent@company.com for immediate threats

## Vulnerability Disclosure

We follow responsible disclosure:
1. Report vulnerabilities privately to security@company.com
2. Allow 90 days for remediation before public disclosure
3. Security acknowledgments provided for valid reports

---

**Last Updated**: 2024-08-23
**Next Review**: 2024-11-23
**Document Version**: 1.0
