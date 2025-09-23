#!/usr/bin/env node

/**
 * 🚀 Quick Setup Script - Billetterie Production
 * 
 * This script quickly configures the 3 urgent priorities:
 * 1. Sentry in production
 * 2. Prometheus/Grafana
 * 3. Performance tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for logs
const colors = {
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  reset: '\x1b[0m'     // Reset
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function createEnvFileIfNeeded() {
  const envPath = '.env';
  const envExamplePath = '.env.example';
  
  if (!checkFileExists(envPath)) {
    if (checkFileExists(envExamplePath)) {
      log('📋 Copying .env file from .env.example');
      fs.copyFileSync(envExamplePath, envPath);
      log('✅ .env file created', 'success');
    } else {
      log('⚠️  Neither .env nor .env.example found', 'warn');
    }
  }
  
  return checkFileExists(envPath);
}

function setupSentry() {
  log('🔧 Configuring Sentry...');
  
  const envPath = '.env';
  let envContent = '';
  
  if (checkFileExists(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if Sentry is already configured
  if (envContent.includes('NEXT_PUBLIC_SENTRY_DSN=') && 
      !envContent.includes('NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io')) {
    log('✅ Sentry seems already configured', 'success');
    return true;
  }
  
  // Add Sentry variables if not present
  if (!envContent.includes('NEXT_PUBLIC_SENTRY_DSN=')) {
    log('➕ Adding Sentry variables to .env');
    
    const sentryConfig = `

# =================================
# MONITORING & OBSERVABILITY  
# =================================
# TODO: Replace with your real Sentry DSN
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_RELEASE=billetterie@1.0.0
SENTRY_ENVIRONMENT=production
SENTRY_DEBUG=false
`;
    
    fs.appendFileSync(envPath, sentryConfig);
  }
  
  log('📋 SENTRY CONFIGURATION REQUIRED:', 'warn');
  log('   1. Create an account on https://sentry.io');
  log('   2. Create a Next.js project');
  log('   3. Copy the DSN into .env (NEXT_PUBLIC_SENTRY_DSN)');
  log('   4. Test with: curl http://localhost:3000/api/sentry/test');
  
  return false;
}

function setupPrometheus() {
  log('📊 Configuring Prometheus/Grafana...');
  
  // Check that monitoring files exist
  const monitoringFiles = [
    'monitoring/prometheus.yml',
    'monitoring/grafana/dashboards/billetterie-overview.json',
    'docker-compose.monitoring.yml'
  ];
  
  const allExist = monitoringFiles.every(file => {
    const exists = checkFileExists(file);
    if (!exists) {
      log(`❌ Missing file: ${file}`, 'error');
    }
    return exists;
  });
  
  if (allExist) {
    log('✅ All monitoring files are present', 'success');
    
    log('📋 STARTING MONITORING:', 'info');
    log('   1. Start application: yarn dev');
    log('   2. Start monitoring: yarn docker:monitoring');  
    log('   3. Access Grafana: http://localhost:3001 (admin/admin)');
    log('   4. Access Prometheus: http://localhost:9090');
    log('   5. App metrics: http://localhost:3000/api/metrics');
    
    return true;
  }
  
  return false;
}

function setupPerformanceTests() {
  log('⚡ Configuring performance tests...');
  
  // Check Artillery
  try {
    execSync('npx artillery --version', { stdio: 'pipe' });
    log('✅ Artillery installed', 'success');
  } catch (error) {
    log('📦 Installing Artillery...');
    try {
      execSync('yarn add --dev artillery', { stdio: 'inherit' });
      log('✅ Artillery installed successfully', 'success');
    } catch (installError) {
      log('❌ Failed to install Artillery', 'error');
      return false;
    }
  }
  
  // Check test files
  const testFiles = [
    'tests/performance/load-test.yml',
    'tests/performance/stress-test.yml',
    'tests/performance/capacity-test.yml',
    'tests/performance/run-performance-tests.js'
  ];
  
  const allExist = testFiles.every(file => {
    const exists = checkFileExists(file);
    if (!exists) {
      log(`❌ Missing test file: ${file}`, 'error');
    }
    return exists;
  });
  
  if (allExist) {
    log('✅ All test files are present', 'success');
    
    log('📋 AVAILABLE PERFORMANCE TESTS:', 'info');
    log('   • yarn perf:load    - Normal test (7 min)');
    log('   • yarn perf:stress  - Stress test (4 min)');
    log('   • yarn perf:capacity - Capacity test (10 min)');
    log('   • yarn perf:test         - All tests (20 min)');
    
    return true;
  }
  
  return false;
}

function runHealthCheck() {
  log('🏥 Checking application status...');
  
  try {
    // Simple attempt with node (more portable than curl)
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      timeout: 5000
    };
    
    return new Promise((resolve) => {
      const req = http.get(options, (res) => {
        if (res.statusCode === 200) {
          log('✅ Application accessible on localhost:3000', 'success');
          resolve(true);
        } else {
          log(`⚠️  Application responds with code ${res.statusCode}`, 'warn');
          resolve(false);
        }
      });
      
      req.on('error', () => {
        log('❌ Application not accessible on localhost:3000', 'warn');
        log('   Start the app with: npm run dev', 'info');
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        log('⏱️  Timeout while checking the app', 'warn');
        resolve(false);
      });
    });
    
  } catch (error) {
    log('❌ Error while checking the app', 'warn');
    return false;
  }
}

function displaySummary(results) {
  log('\n🎯 CONFIGURATION SUMMARY', 'info');
  log('================================');
  
  const items = [
    { name: '🔐 Sentry (Error monitoring)', status: results.sentry, action: 'Configure DSN in .env' },
    { name: '📊 Prometheus/Grafana', status: results.prometheus, action: 'Start: npm run docker:monitoring' },
    { name: '⚡ Performance tests', status: results.performance, action: 'Test: npm run test:performance:load' },
    { name: '🏥 Application', status: results.health, action: 'Start: npm run dev' }
  ];
  
  items.forEach(item => {
    const status = item.status ? '✅ OK' : '❌ TODO';
    log(`${status} ${item.name}`);
    if (!item.status && item.action) {
      log(`     → ${item.action}`, 'info');
    }
  });
  
  const completedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  log(`\n📊 Progress: ${completedCount}/${totalCount} items configured`);
  
  if (completedCount === totalCount) {
    log('🎉 Configuration complete! Your app is ready for production.', 'success');
  } else {
    log('⚠️  Incomplete configuration. Follow the actions above.', 'warn');
  }
  
  // Next steps
  log('\n🚀 RECOMMENDED NEXT STEPS:', 'info');
  log('1. Configure Sentry DSN (absolute priority)');
  log('2. Test monitoring: npm run docker:monitoring');
  log('3. Run a performance test: npm run test:performance:load');
  log('4. Check metrics: http://localhost:3000/api/metrics');
  log('5. Check updated TODO list: PRODUCTION_TODO.md');
}

async function main() {
  log('🚀 QUICK SETUP - BILLETTERIE PRODUCTION', 'info');
  log('===============================================');
  
  // Step 1: .env file
  createEnvFileIfNeeded();
  
  // Step 2: Checks
  const results = {
    sentry: setupSentry(),
    prometheus: setupPrometheus(), 
    performance: setupPerformanceTests(),
    health: await runHealthCheck()
  };
  
  // Step 3: Summary
  displaySummary(results);
}

// Error handling
process.on('uncaughtException', (error) => {
  log(`💥 Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});

process.on('SIGINT', () => {
  log('\n🛑 Configuration interrupted', 'warn');
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    log(`💥 Error during configuration: ${error.message}`, 'error');
    process.exit(1);
  });
}
