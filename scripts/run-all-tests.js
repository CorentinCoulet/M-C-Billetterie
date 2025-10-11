#!/usr/bin/env node

/**
 * Script to run all tests: Jest (unit, integration, etc.) + Playwright (E2E)
 * This ensures both test suites run sequentially
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    log(`\n${'='.repeat(60)}`, colors.cyan);
    log(`🚀 ${description}`, colors.bright + colors.blue);
    log('='.repeat(60), colors.cyan);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`\n✅ ${description} - PASSED`, colors.green);
        resolve();
      } else {
        log(`\n❌ ${description} - FAILED (exit code: ${code})`, colors.red);
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`\n❌ ${description} - ERROR: ${error.message}`, colors.red);
      reject(error);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  
  log('\n' + '='.repeat(60), colors.bright + colors.cyan);
  log('🧪 RUNNING ALL TESTS - JEST + PLAYWRIGHT', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright + colors.cyan);

  try {
    // Step 1: Run Jest tests (unit, integration, API, etc.)
    await runCommand(
      'yarn',
      ['jest', '--no-coverage'],
      'Jest Tests (Unit, Integration, API, Security, etc.)'
    );

    // Step 2: Run Playwright E2E tests
    await runCommand(
      'yarn',
      ['playwright', 'test'],
      'Playwright E2E Tests'
    );

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), colors.bright + colors.green);
    log('✅ ALL TESTS PASSED SUCCESSFULLY! 🎉', colors.bright + colors.green);
    log('='.repeat(60), colors.bright + colors.green);
    log(`⏱️  Total time: ${duration}s`, colors.green);
    log('='.repeat(60) + '\n', colors.bright + colors.green);

    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), colors.bright + colors.red);
    log('❌ TESTS FAILED', colors.bright + colors.red);
    log('='.repeat(60), colors.bright + colors.red);
    log(`⏱️  Time elapsed: ${duration}s`, colors.red);
    log(`💡 Error: ${error.message}`, colors.yellow);
    log('='.repeat(60) + '\n', colors.bright + colors.red);

    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  log('\n\n⚠️  Tests interrupted by user', colors.yellow);
  process.exit(130);
});

// Run the tests
runAllTests();
