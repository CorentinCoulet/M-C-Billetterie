#!/usr/bin/env node

/**
 * Yarn Environment Verification Script
 * Checks that the project is properly configured to use Yarn
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking Yarn environment...\n');

let hasErrors = false;
let hasWarnings = false;

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  hasErrors = true;
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  hasWarnings = true;
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

// 1. Check if Yarn is installed
console.log('📦 Checking Yarn...');
try {
  const yarnVersion = execSync('yarn --version', { encoding: 'utf-8' }).trim();
  success(`Yarn is installed (version ${yarnVersion})`);
  
  // Check minimum version
  const [major, minor] = yarnVersion.split('.').map(Number);
  if (major < 1 || (major === 1 && minor < 22)) {
    warning('Old Yarn version. Recommended: >= 1.22.0');
  }
} catch (e) {
  error('Yarn is not installed!');
  info('Installation: corepack enable or see https://yarnpkg.com/getting-started/install');
  hasErrors = true;
}

console.log('');

// 2. Check package.json
console.log('📄 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  if (packageJson.packageManager) {
    if (packageJson.packageManager.startsWith('yarn')) {
      success(`packageManager configured: ${packageJson.packageManager}`);
    } else {
      error(`Incorrect packageManager: ${packageJson.packageManager}`);
    }
  } else {
    warning('packageManager not defined in package.json');
  }
  
  if (packageJson.engines && packageJson.engines.yarn) {
    success(`Required Yarn version: ${packageJson.engines.yarn}`);
  } else {
    warning('Yarn version not specified in engines');
  }
} catch (e) {
  error('Unable to read package.json');
}

console.log('');

// 3. Check .yarnrc.yml
console.log('⚙️  Checking .yarnrc.yml...');
if (fs.existsSync('.yarnrc.yml')) {
  success('.yarnrc.yml exists');
} else {
  warning('.yarnrc.yml does not exist');
  info('This file allows configuring Yarn for the project');
}

console.log('');

// 4. Check .npmrc
console.log('🚫 Checking .npmrc (npm blocking)...');
if (fs.existsSync('.npmrc')) {
  const npmrc = fs.readFileSync('.npmrc', 'utf-8');
  if (npmrc.includes('engine-strict=true')) {
    success('.npmrc configured to block npm');
  } else {
    warning('.npmrc exists but does not block npm');
  }
} else {
  warning('.npmrc does not exist');
  info('This file should block npm usage');
}

console.log('');

// 5. Check node_modules
console.log('📁 Checking node_modules...');
if (fs.existsSync('node_modules')) {
  // Check if installed with Yarn
  if (fs.existsSync('yarn.lock')) {
    success('node_modules installed with Yarn');
  } else if (fs.existsSync('package-lock.json')) {
    error('package-lock.json detected! Use Yarn instead of npm');
    info('Remove: rm -rf node_modules package-lock.json && yarn install');
  }
} else {
  warning('node_modules does not exist');
  info('Run: yarn install');
}

console.log('');

// 6. Check yarn.lock
console.log('🔒 Checking yarn.lock...');
if (fs.existsSync('yarn.lock')) {
  success('yarn.lock exists');
  
  // Check if up to date
  try {
    execSync('yarn check --verify-tree', { encoding: 'utf-8', stdio: 'pipe' });
    success('yarn.lock is up to date');
  } catch (e) {
    warning('yarn.lock might be outdated');
    info('Run: yarn install');
  }
} else {
  warning('yarn.lock does not exist');
  info('Will be created on next: yarn install');
}

console.log('');

// 7. Check environment variables
console.log('🌍 Checking environment variables...');
if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf-8');
  if (env.includes('APP_VERSION') || env.includes('VERSION')) {
    success('Version variables configured in .env');
  } else {
    warning('APP_VERSION not found in .env');
    info('Add: APP_VERSION=1.0.0');
  }
} else {
  warning('.env does not exist');
  info('Copy: cp .env.example .env');
}

console.log('');

// 8. Check package-lock.json (should not exist)
console.log('🗑️  Checking residual npm files...');
if (fs.existsSync('package-lock.json')) {
  error('package-lock.json exists (should be removed)');
  info('Remove: rm package-lock.json');
} else {
  success('No package-lock.json');
}

if (fs.existsSync('npm-debug.log')) {
  warning('npm-debug.log exists (can be removed)');
} else {
  success('No npm log files');
}

console.log('');
console.log('═══════════════════════════════════════════');

// Summary
if (!hasErrors && !hasWarnings) {
  console.log(`${colors.green}✅ Everything is correct! Your environment is properly configured for Yarn.${colors.reset}`);
  process.exit(0);
} else if (hasErrors) {
  console.log(`${colors.red}❌ Errors were detected. Please fix them.${colors.reset}`);
  console.log('');
  console.log('📚 Check YARN_MIGRATION.md for more information');
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}⚠️  Some warnings detected, but the environment should work.${colors.reset}`);
  console.log('');
  console.log('📚 Check YARN_MIGRATION.md to optimize your configuration');
  process.exit(0);
}
