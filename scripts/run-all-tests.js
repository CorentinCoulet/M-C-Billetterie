#!/usr/bin/env node

/**
 * Orchestrateur de tests complet
 * - Lint
 * - Type-check
 * - Jest (unit, integration, API, property, sécurité, etc.)
 * - Playwright (E2E)
 * - Performance (suite rapide par défaut, complète avec --full)
 *
 * Options CLI:
 *   --full           Active le mode complet (couverture + perf complète)
 *   --coverage       Active la couverture Jest
 *   --skip-lint      Saute l'étape ESLint
 *   --skip-types     Saute l'étape TypeScript type-check
 *   --skip-perf      Saute l'étape performance
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse CLI flags
const argv = process.argv.slice(2);
const flags = new Set(argv);
const isFull = flags.has('--full');
const withCoverage = isFull || flags.has('--coverage');
const skipLint = flags.has('--skip-lint');
const skipTypes = flags.has('--skip-types');
const skipPerf = flags.has('--skip-perf');

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
  log('🧪 LANCEMENT DES TESTS COMPLETS', colors.bright + colors.cyan);
  const modeParts = [];
  if (isFull) modeParts.push('full'); else modeParts.push('quick');
  if (withCoverage) modeParts.push('coverage');
  if (skipPerf) modeParts.push('no-perf');
  if (skipLint) modeParts.push('no-lint');
  if (skipTypes) modeParts.push('no-types');
  log(`Mode: ${modeParts.join(', ')}`, colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright + colors.cyan);

  try {
    // Step 0: Lint
    if (!skipLint) {
      await runCommand(
        'yarn',
        ['lint'],
        'ESLint (qualité de code)'
      );
    } else {
      log('⏭️  Lint sauté (--skip-lint)', colors.yellow);
    }

    // Step 0b: Type-check
    if (!skipTypes) {
      await runCommand(
        'yarn',
        ['type-check'],
        'TypeScript type-check'
      );
    } else {
      log('⏭️  Type-check sauté (--skip-types)', colors.yellow);
    }

    // Step 1: Run Jest tests (unit, integration, API, etc.)
    const jestArgs = ['jest'];
    if (withCoverage) {
      jestArgs.push('--coverage');
    } else {
      jestArgs.push('--no-coverage');
    }
    await runCommand('yarn', jestArgs, 'Jest (Unit, Intégration, API, Sécurité, etc.)');

    // Step 2: Run Playwright E2E tests
    await runCommand(
      'yarn',
      ['playwright', 'test'],
      'Playwright E2E Tests'
    );

    // Step 3: Performance suite
    if (!skipPerf) {
      const perfArgs = ['perf:suite'];
      if (isFull) {
        perfArgs[0] = 'perf:suite:full';
      }
      await runCommand('yarn', [perfArgs[0]], `Suite de performance (${isFull ? 'complète' : 'rapide'})`);
    } else {
      log('⏭️  Performance sauté (--skip-perf)', colors.yellow);
    }

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), colors.bright + colors.green);
    log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS ! 🎉', colors.bright + colors.green);
    log('='.repeat(60), colors.bright + colors.green);
    log(`⏱️  Total time: ${duration}s`, colors.green);
    log('='.repeat(60) + '\n', colors.bright + colors.green);

    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), colors.bright + colors.red);
    log('❌ DES TESTS ONT ÉCHOUÉ', colors.bright + colors.red);
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
