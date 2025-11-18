#!/usr/bin/env node
/*
  Génère automatiquement un fichier .env.dev ou .env.prod avec des valeurs cohérentes
  et des secrets forts. Usage:
    node scripts/generate-env.js dev
    node scripts/generate-env.js prod

  - Ne remplace pas un fichier existant par défaut.
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function randHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function ensureNotExists(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`[env] Le fichier existe déjà, rien à faire: ${filePath}`);
    process.exit(0);
  }
}

function writeFile(target, content) {
  fs.writeFileSync(target, content, { encoding: 'utf8' });
  console.log(`[env] Fichier généré: ${target}`);
}

function buildDevEnv() {
  const dbPass = randHex(32);
  const redisPass = randHex(32);
  const jwt = randHex(32);
  const jwtRefresh = randHex(32);
  const enc = randHex(32);
  const aes = randHex(32);
  const dataEnc = randHex(32);
  const session = randHex(32);
  const qr = randHex(32);

  return [
    '# ================= DEV GENERATED =================',
    'COMPOSE_ENV=dev',
    'COMPOSE_NETWORK=billetterie-dev-network',
    '',
    '# Database',
    'DB_USER=postgres',
    `DB_PASSWORD=${dbPass}`,
    'DB_NAME=billetterie',
    'DB_PORT=5432',
    'DB_HOST=db-dev',
    `DATABASE_URL=postgresql://postgres:${dbPass}@db-dev:5432/billetterie`,
    '',
    '# Redis',
    `REDIS_PASSWORD=${redisPass}`,
    'REDIS_HOST=redis-dev',
    `REDIS_URL=redis://:${redisPass}@redis-dev:6379`,
    '',
    '# Secrets',
    `JWT_SECRET=${jwt}`,
    `JWT_REFRESH_SECRET=${jwtRefresh}`,
    `ENCRYPTION_KEY=${enc}`,
    `AES_SECRET=${aes}`,
    `DATA_ENCRYPTION_KEY=${dataEnc}`,
    `SESSION_SECRET=${session}`,
    `QR_ROTATION_SECRET=${qr}`,
    '',
    '# Server',
    'PORT=3001',
    'NODE_ENV=development',
    'FRONTEND_URL=http://localhost:3001',
    'CORS_ORIGIN=http://localhost:3001',
    'NEXT_PUBLIC_APP_URL=http://localhost:3001',
    '',
    '# Security',
    'SECURITY_HELMET_ENABLED=true',
    'SECURITY_CORS_ENABLED=true',
    'SECURITY_RATE_LIMIT_ENABLED=false',
    '',
    '# Features',
    'FEATURE_AUTH_ENABLED=true',
    'FEATURE_EVENTS_ENABLED=true',
    'FEATURE_PAYMENTS_ENABLED=false',
    'FEATURE_EMAIL_ENABLED=true',
    '',
    '# Stripe (tests)',
    'STRIPE_PUBLIC_KEY=pk_test_placeholder',
    'STRIPE_SECRET_KEY=sk_test_placeholder',
    'STRIPE_WEBHOOK_SECRET=whsec_placeholder',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder',
    '',
    '# Email (Mailhog)',
    'EMAIL_FROM=noreply@billetterie-dev.local',
    'CONTACT_EMAIL=contact@billetterie-dev.local',
    'SMTP_HOST=mailhog',
    'SMTP_PORT=1025',
    'SMTP_USER=',
    'SMTP_PASS=',
    '',
    '# Monitoring',
    'MONITORING_LOGGING_ENABLED=true',
    'DEBUG=true',
    'VERBOSE_LOGGING=true',
    '',
    '# Uploads',
    'UPLOAD_BASE_DIR=./uploads',
    'MAX_FILE_SIZE=5242880',
    '',
    '# Cache',
    'CACHE_ENABLED=true',
    'CACHE_TTL=3600',
    '',
    '# Rate limiting',
    'RATE_LIMIT_WINDOW_MS=900000',
    'RATE_LIMIT_MAX_REQUESTS=1000',
    '',
    '# Seed dev',
    'SEED=true',
    'SEED_ADMIN_PASSWORD=Admin123!Dev',
    'SEED_ORGANIZER_PASSWORD=Organizer123!Dev',
    'SEED_USER_PASSWORD=User123!Dev',
    '',
    '# Admin tools',
    'ADMINER_PORT=8080',
    'ADMINER_DESIGN=pepa-linha-dark',
    '',
    '# Sentry',
    'NEXT_PUBLIC_SENTRY_DSN=',
    'SENTRY_RELEASE=billetterie@1.0.0-dev',
    'SENTRY_ENVIRONMENT=development',
    'SENTRY_DEBUG=false',
    '',
    '# Monitoring Ports',
    'PROMETHEUS_PORT=9090',
    'GRAFANA_PORT=3002',
    'POSTGRES_EXPORTER_PORT=9187',
    'REDIS_EXPORTER_PORT=9121',
    'NODE_EXPORTER_PORT=9100',
    'ALERTMANAGER_PORT=9093',
    '',
    '# Grafana',
    'GRAFANA_ADMIN_USER=admin',
    'GRAFANA_ADMIN_PASSWORD=admin123',
    '',
  ].join('\n');
}

function buildProdEnv() {
  const dbPass = randHex(32);
  const redisPass = randHex(32);
  const jwt = randHex(32);
  const jwtRefresh = randHex(32);
  const enc = randHex(32);
  const aes = randHex(32);
  const dataEnc = randHex(32);
  const session = randHex(32);
  const qr = randHex(32);

  return [
    '# ================= PROD GENERATED =================',
    'COMPOSE_ENV=prod',
    'COMPOSE_NETWORK=billetterie-network',
    '',
    '# Database',
    'DB_USER=postgres',
    `DB_PASSWORD=${dbPass}`,
    'DB_NAME=billetterie',
    'DB_PORT=5432',
    'DB_HOST=db',
    `DATABASE_URL=postgresql://postgres:${dbPass}@db:5432/billetterie`,
    '',
    '# Redis',
    `REDIS_PASSWORD=${redisPass}`,
    'REDIS_HOST=redis',
    `REDIS_URL=redis://:${redisPass}@redis:6379`,
    '',
    '# Secrets',
    `JWT_SECRET=${jwt}`,
    `JWT_REFRESH_SECRET=${jwtRefresh}`,
    `ENCRYPTION_KEY=${enc}`,
    `AES_SECRET=${aes}`,
    `DATA_ENCRYPTION_KEY=${dataEnc}`,
    `SESSION_SECRET=${session}`,
    `QR_ROTATION_SECRET=${qr}`,
    '',
    '# Server',
    'PORT=3000',
    'NODE_ENV=production',
    'FRONTEND_URL=https://billetterie.example.com',
    'CORS_ORIGIN=https://billetterie.example.com',
    'NEXT_PUBLIC_APP_URL=https://billetterie.example.com',
    '',
    '# Security',
    'SECURITY_HELMET_ENABLED=true',
    'SECURITY_CORS_ENABLED=true',
    'SECURITY_RATE_LIMIT_ENABLED=true',
    '',
    '# Features',
    'FEATURE_AUTH_ENABLED=true',
    'FEATURE_EVENTS_ENABLED=true',
    'FEATURE_PAYMENTS_ENABLED=true',
    'FEATURE_EMAIL_ENABLED=true',
    '',
    '# Stripe (à renseigner)',
    'STRIPE_PUBLIC_KEY=pk_live_CHANGEME',
    'STRIPE_SECRET_KEY=sk_live_CHANGEME',
    'STRIPE_WEBHOOK_SECRET=whsec_CHANGEME',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_CHANGEME',
    '',
    '# Email (à renseigner)',
    'EMAIL_FROM=noreply@billetterie.example.com',
    'CONTACT_EMAIL=contact@billetterie.example.com',
    'SMTP_HOST=smtp.gmail.com',
    'SMTP_PORT=587',
    'SMTP_USER=production.billetterie@gmail.com',
    'SMTP_PASS=CHANGEME',
    '',
    '# Monitoring',
    'MONITORING_LOGGING_ENABLED=true',
    'DEBUG=false',
    'VERBOSE_LOGGING=false',
    '',
    '# Uploads',
    'UPLOAD_BASE_DIR=./uploads',
    'MAX_FILE_SIZE=10485760',
    '',
    '# Cache',
    'CACHE_ENABLED=true',
    'CACHE_TTL=7200',
    '',
    '# Rate limiting',
    'RATE_LIMIT_WINDOW_MS=900000',
    'RATE_LIMIT_MAX_REQUESTS=100',
    '',
    '# Seed (désactivé en prod)',
    'SEED_ADMIN_PASSWORD=DISABLED_IN_PRODUCTION',
    'SEED_ORGANIZER_PASSWORD=DISABLED_IN_PRODUCTION',
    'SEED_USER_PASSWORD=DISABLED_IN_PRODUCTION',
    '',
    '# Admin',
    'ADMINER_PORT=8080',
    'ADMINER_DESIGN=pepa-linha-dark',
    '',
    '# Sentry',
    'NEXT_PUBLIC_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/YOUR_PROJECT_ID',
    'SENTRY_RELEASE=billetterie@1.0.0',
    'SENTRY_ENVIRONMENT=production',
    'SENTRY_DEBUG=false',
    '',
    '# Monitoring Ports',
    'PROMETHEUS_PORT=9090',
    'GRAFANA_PORT=3002',
    'POSTGRES_EXPORTER_PORT=9187',
    'REDIS_EXPORTER_PORT=9121',
    'NODE_EXPORTER_PORT=9100',
    'ALERTMANAGER_PORT=9093',
    '',
    '# Grafana',
    'GRAFANA_ADMIN_USER=admin',
    `GRAFANA_ADMIN_PASSWORD=${randHex(16)}`,
    '',
  ].join('\n');
}

function main() {
  const env = (process.argv[2] || '').toLowerCase();
  if (!['dev', 'prod'].includes(env)) {
    console.error('Usage: node scripts/generate-env.js <dev|prod>');
    process.exit(1);
  }

  const target = path.resolve(process.cwd(), env === 'dev' ? '.env.dev' : '.env.prod');
  ensureNotExists(target);

  const content = env === 'dev' ? buildDevEnv() : buildProdEnv();
  writeFile(target, content + '\n');
}

main();
