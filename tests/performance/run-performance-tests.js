#!/usr/bin/env node

/**
 * Script de tests de performance automatisé
 * Lance une série de tests avec Artillery et génère des rapports
 * 
 * Usage:
 * node run-performance-tests.js [test-type]
 * 
 * test-type: load | stress | capacity | all (default: load)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration des tests
const TESTS = {
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

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports', 'performance');
const TESTS_DIR = __dirname;

// Créer le dossier de rapports s'il n'existe pas
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Fonction utilitaires
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('🔍 Vérification des prérequis...');
  
  try {
    // Vérifier Artillery
    execSync('npx artillery --version', { stdio: 'pipe' });
    log('✅ Artillery installé');
  } catch (error) {
    log('❌ Artillery n\'est pas installé. Run: yarn add --dev artillery', 'error');
    process.exit(1);
  }
  
  try {
    // Vérifier si l'application est démarrée
    const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health', { stdio: 'pipe' });
    if (response.toString().trim() === '200') {
      log('✅ Application démarrée sur localhost:3000');
    } else {
      log('⚠️  Application non accessible ou non démarrée', 'warn');
      log('   Assurez-vous que l\'app fonctionne : yarn dev', 'warn');
    }
  } catch (error) {
    log('⚠️  Impossible de vérifier l\'état de l\'application', 'warn');
    log('   Assurez-vous que l\'app fonctionne : yarn dev', 'warn');
  }
}

async function runTest(testType) {
  const test = TESTS[testType];
  if (!test) {
    log(`❌ Type de test inconnu: ${testType}`, 'error');
    return false;
  }
  
  const testFile = path.join(TESTS_DIR, test.file);
  const reportFile = path.join(REPORTS_DIR, `${testType}-report-${Date.now()}.json`);
  const htmlReportFile = path.join(REPORTS_DIR, `${testType}-report-${Date.now()}.html`);
  
  log(`🚀 Lancement du test: ${test.name}`);
  log(`📄 Description: ${test.description}`);
  log(`📁 Fichier de test: ${test.file}`);
  
  try {
    const command = `npx artillery run "${testFile}" --output "${reportFile}"`;
    log(`📋 Commande: ${command}`);
    
    // Lancer le test
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('✅ Test terminé avec succès', 'success');
    
    // Générer le rapport HTML
    try {
      const htmlCommand = `npx artillery report "${reportFile}" --output "${htmlReportFile}"`;
      execSync(htmlCommand, { stdio: 'pipe' });
      log(`📊 Rapport HTML généré: ${htmlReportFile}`, 'success');
    } catch (error) {
      log('⚠️  Erreur lors de la génération du rapport HTML', 'warn');
    }
    
    // Afficher un résumé
    displaySummary(reportFile);
    
    return true;
    
  } catch (error) {
    log(`❌ Échec du test: ${error.message}`, 'error');
    return false;
  }
}

function displaySummary(reportFile) {
  try {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const aggregate = report.aggregate;
    
    log('📊 RÉSUMÉ DU TEST', 'info');
    log('================');
    log(`📈 Requêtes totales: ${aggregate.counters['http.requests'] || 'N/A'}`);
    log(`📈 Réponses reçues: ${aggregate.counters['http.responses'] || 'N/A'}`);
    log(`⏱️  Temps de réponse médian: ${Math.round(aggregate.latency?.median || 0)}ms`);
    log(`⏱️  95e percentile: ${Math.round(aggregate.latency?.p95 || 0)}ms`);
    log(`⏱️  99e percentile: ${Math.round(aggregate.latency?.p99 || 0)}ms`);
    log(`❌ Erreurs: ${aggregate.counters['errors.total'] || 0}`);
    
    if (aggregate.codes) {
      log('📋 Codes de réponse:');
      Object.entries(aggregate.codes).forEach(([code, count]) => {
        log(`   ${code}: ${count}`);
      });
    }
    
    log('================');
    
  } catch (error) {
    log('⚠️  Impossible de lire le résumé du rapport', 'warn');
  }
}

async function runAllTests() {
  log('🎯 Lancement de tous les tests de performance');
  
  const results = {};
  
  for (const [testType, test] of Object.entries(TESTS)) {
    log(`\n⏳ Préparation du test: ${testType}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre les tests
    
    const success = await runTest(testType);
    results[testType] = success;
    
    if (!success) {
      log(`⚠️  Le test ${testType} a échoué, continuation avec les autres tests`, 'warn');
    }
    
    // Pause plus longue entre les tests intensifs
    if (testType !== 'load') {
      log('⏸️  Pause de 5 secondes avant le test suivant...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Résumé final
  log('\n🏁 RÉSUMÉ FINAL DES TESTS', 'info');
  log('========================');
  Object.entries(results).forEach(([testType, success]) => {
    const status = success ? '✅ RÉUSSI' : '❌ ÉCHOUÉ';
    const test = TESTS[testType];
    log(`${status} - ${test.name}`);
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  log(`\n📊 Résultat global: ${successCount}/${totalCount} tests réussis`);
  
  if (successCount === totalCount) {
    log('🎉 Tous les tests ont réussi !', 'success');
  } else {
    log('⚠️  Certains tests ont échoué. Vérifiez les rapports.', 'warn');
  }
}

// Script principal
async function main() {
  const testType = process.argv[2] || 'all';
  
  log('🎯 TESTS DE PERFORMANCE BILLETTERIE', 'info');
  log('===================================');
  
  checkPrerequisites();
  
  if (testType === 'all') {
    await runAllTests();
  } else if (TESTS[testType]) {
    await runTest(testType);
  } else {
    log('❌ Type de test invalide', 'error');
    log('Types disponibles: ' + Object.keys(TESTS).join(', ') + ', all');
    process.exit(1);
  }
  
  log('\n🏁 Tests terminés !', 'success');
  log(`📁 Rapports disponibles dans: ${REPORTS_DIR}`);
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', () => {
  log('\n🛑 Tests interrompus par l\'utilisateur', 'warn');
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    log(`💥 Erreur fatale: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runTest, runAllTests };
