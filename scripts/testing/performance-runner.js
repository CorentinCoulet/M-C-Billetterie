#!/usr/bin/env node

/**
 * 🎯 Performance Test Runner - Unified CLI
 * 
 * Centralise tous les tests de performance avec une CLI unique et des sous-commandes.
 * Remplace performance-suite.js et run-performance-tests.js
 * 
 * Usage:
 *   node scripts/testing/performance-runner.js [command] [options]
 * 
 * Commands:
 *   suite [--full]         Lance une suite complète de tests de performance
 *   artillery [type]       Lance des tests Artillery (load|stress|capacity|all)
 *   http                   Lance les tests de performance HTTP
 *   docker                 Lance le diagnostic Docker
 *   all                    Lance tous les tests disponibles
 * 
 * Options:
 *   --full                 Mode complet (pour suite)
 *   --help, -h            Affiche l'aide
 */

const { exec } = require('child_process');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'performance');
const TESTS_DIR = path.join(process.cwd(), 'tests', 'performance');

const ARTILLERY_TESTS = {
  load: {
    file: 'load-test.yml',
    name: 'Test de charge standard',
    description: 'Test de performance en conditions normales'
  },
  stress: {
    file: 'stress-test.yml',
    name: 'Test de stress (Black Friday)',
    description: 'Simulation de pic de charge extrême'
  },
  capacity: {
    file: 'capacity-test.yml',
    name: 'Test de capacité',
    description: 'Trouve les limites de performance'
  }
};

const SUITE_TESTS = {
  basic: [
    { command: 'node scripts/development/diagnostic-docker.js', description: 'Diagnostic Docker et ressources' },
    { command: 'node scripts/testing/performance-http-test.js', description: 'Tests de performance HTTP' }
  ],
  full: [
    { command: 'yarn perf:test', description: 'Tests de performance Artillery (si disponible)' },
    { command: 'yarn test:coverage', description: 'Tests unitaires avec couverture' }
  ]
};

// Utilitaires de log avec couleurs
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  title: (msg) => {
    console.log('\n' + '═'.repeat(60));
    console.log(`🎯 ${msg}`);
    console.log('═'.repeat(60) + '\n');
  }
};

// Créer le dossier de rapports si nécessaire
function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// Exécuter une commande avec gestion d'erreurs
async function runCommand(command, description) {
  log.info(`${description}...`);
  console.log('─'.repeat(50));
  
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes
    });
    
    if (stdout) console.log(stdout);
    if (stderr) log.warn(stderr);
    
    log.success(`${description} terminé`);
    return true;
  } catch (error) {
    log.error(`${description} échoué: ${error.message}`);
    return false;
  }
}

// Commande: suite
async function runSuite(options = {}) {
  log.title('SUITE DE TESTS DE PERFORMANCE');
  
  const fullMode = options.full || false;
  console.log(`Mode: ${fullMode ? 'COMPLET' : 'RAPIDE'}`);
  console.log(`Début: ${new Date().toLocaleString()}\n`);
  
  const results = { total: 0, successful: 0, failed: 0 };
  const tests = fullMode 
    ? [...SUITE_TESTS.basic, ...SUITE_TESTS.full]
    : SUITE_TESTS.basic;
  
  results.total = tests.length;
  
  for (const test of tests) {
    const success = await runCommand(test.command, test.description);
    success ? results.successful++ : results.failed++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Résumé
  console.log('\n📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`✅ Réussis: ${results.successful}/${results.total}`);
  console.log(`❌ Échoués: ${results.failed}/${results.total}`);
  console.log(`📈 Taux: ${((results.successful / results.total) * 100).toFixed(1)}%`);
  
  return results.failed === 0;
}

// Commande: artillery
async function runArtillery(testType = 'load') {
  log.title(`ARTILLERY - ${testType.toUpperCase()}`);
  
  ensureReportsDir();
  
  if (testType === 'all') {
    const results = [];
    for (const [type, test] of Object.entries(ARTILLERY_TESTS)) {
      log.info(`\n⏳ Préparation du test: ${type}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = await runArtilleryTest(type, test);
      results.push({ type, success });
      
      if (type !== 'capacity') {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Résumé
    console.log('\n🏁 RÉSUMÉ ARTILLERY');
    console.log('═'.repeat(60));
    results.forEach(({ type, success }) => {
      const status = success ? '✅ RÉUSSI' : '❌ ÉCHOUÉ';
      console.log(`${status} - ${ARTILLERY_TESTS[type].name}`);
    });
    
    return results.every(r => r.success);
  }
  
  const test = ARTILLERY_TESTS[testType];
  if (!test) {
    log.error(`Type de test inconnu: ${testType}`);
    log.info(`Types disponibles: ${Object.keys(ARTILLERY_TESTS).join(', ')}, all`);
    return false;
  }
  
  return await runArtilleryTest(testType, test);
}

async function runArtilleryTest(testType, test) {
  const testFile = path.join(TESTS_DIR, test.file);
  const reportFile = path.join(REPORTS_DIR, `${testType}-report-${Date.now()}.json`);
  const htmlReportFile = path.join(REPORTS_DIR, `${testType}-report-${Date.now()}.html`);
  
  log.info(`🚀 ${test.name}`);
  log.info(`📄 ${test.description}`);
  
  try {
    // Vérifier Artillery
    try {
      execSync('npx artillery --version', { stdio: 'pipe' });
    } catch {
      log.error('Artillery non installé. Exécutez: yarn add --dev artillery');
      return false;
    }
    
    // Lancer le test
    const command = `npx artillery run "${testFile}" --output "${reportFile}"`;
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    
    log.success('Test terminé');
    
    // Générer rapport HTML
    try {
      const htmlCommand = `npx artillery report "${reportFile}" --output "${htmlReportFile}"`;
      execSync(htmlCommand, { stdio: 'pipe' });
      log.success(`📊 Rapport HTML: ${htmlReportFile}`);
    } catch (error) {
      log.warn('Erreur génération rapport HTML');
    }
    
    // Afficher résumé
    displayArtillerySummary(reportFile);
    
    return true;
  } catch (error) {
    log.error(`Échec: ${error.message}`);
    return false;
  }
}

function displayArtillerySummary(reportFile) {
  try {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const aggregate = report.aggregate;
    
    console.log('\n📊 RÉSUMÉ');
    console.log('═'.repeat(50));
    console.log(`📈 Requêtes: ${aggregate.counters['http.requests'] || 'N/A'}`);
    console.log(`📈 Réponses: ${aggregate.counters['http.responses'] || 'N/A'}`);
    console.log(`⏱️  Médian: ${Math.round(aggregate.latency?.median || 0)}ms`);
    console.log(`⏱️  P95: ${Math.round(aggregate.latency?.p95 || 0)}ms`);
    console.log(`⏱️  P99: ${Math.round(aggregate.latency?.p99 || 0)}ms`);
    console.log(`❌ Erreurs: ${aggregate.counters['errors.total'] || 0}`);
    
    if (aggregate.codes) {
      console.log('\n📋 Codes HTTP:');
      Object.entries(aggregate.codes).forEach(([code, count]) => {
        console.log(`   ${code}: ${count}`);
      });
    }
    console.log('═'.repeat(50));
  } catch (error) {
    log.warn('Impossible de lire le résumé');
  }
}

// Commande: http
async function runHttp() {
  log.title('TESTS DE PERFORMANCE HTTP');
  return await runCommand('node scripts/performance-http-test.js', 'Tests HTTP');
}

// Commande: docker
async function runDocker() {
  log.title('DIAGNOSTIC DOCKER');
  return await runCommand('node scripts/diagnostic-docker.js', 'Diagnostic Docker');
}

// Commande: all
async function runAll() {
  log.title('TOUS LES TESTS DE PERFORMANCE');
  
  const results = [];
  
  results.push({ name: 'Suite complète', success: await runSuite({ full: true }) });
  results.push({ name: 'Artillery complet', success: await runArtillery('all') });
  
  console.log('\n🏁 RÉSUMÉ GLOBAL');
  console.log('═'.repeat(60));
  results.forEach(({ name, success }) => {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${name}`);
  });
  
  return results.every(r => r.success);
}

// Afficher l'aide
function showHelp() {
  console.log(`
🎯 Performance Test Runner - Unified CLI

Usage:
  node scripts/testing/performance-runner.js [command] [options]

Commands:
  suite [--full]         Lance une suite de tests de performance
  artillery <type>       Lance des tests Artillery
                         Types: load, stress, capacity, all
  http                   Lance les tests de performance HTTP
  docker                 Lance le diagnostic Docker
  all                    Lance tous les tests disponibles

Options:
  --full                 Mode complet (pour suite)
  --help, -h            Affiche cette aide

Exemples:
  node scripts/testing/performance-runner.js suite
  node scripts/testing/performance-runner.js suite --full
  node scripts/testing/performance-runner.js artillery load
  node scripts/testing/performance-runner.js artillery all
  node scripts/testing/performance-runner.js all

Via package.json:
  yarn perf:suite
  yarn perf:suite:full
  yarn perf:artillery
  `);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const command = args[0] || 'suite';
  const options = {
    full: args.includes('--full')
  };
  
  let success = false;
  
  switch (command) {
    case 'suite':
      success = await runSuite(options);
      break;
    case 'artillery':
      success = await runArtillery(args[1] || 'load');
      break;
    case 'http':
      success = await runHttp();
      break;
    case 'docker':
      success = await runDocker();
      break;
    case 'all':
      success = await runAll();
      break;
    default:
      log.error(`Commande inconnue: ${command}`);
      showHelp();
      process.exit(1);
  }
  
  process.exit(success ? 0 : 1);
}

// Gestion des signaux
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Tests interrompus par l\'utilisateur');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Tests terminés');
  process.exit(143);
});

// Lancement
if (require.main === module) {
  main().catch(error => {
    log.error(`Erreur fatale: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runSuite, runArtillery, runHttp, runDocker, runAll };
