#!/usr/bin/env node

/**
 * Script utilitaire pour lancer une suite complète de tests de performance
 * Usage: node scripts/performance-suite.js [--full]
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

const args = process.argv.slice(2);
const fullSuite = args.includes('--full');

console.log('🚀 SUITE DE TESTS DE PERFORMANCE M&C BILLETTERIE');
console.log('═'.repeat(60));
console.log(`Mode: ${fullSuite ? 'COMPLET' : 'RAPIDE'}`);
console.log(`Heure de début: ${new Date().toLocaleString()}\n`);

async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log('─'.repeat(50));
  
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes timeout
    });
    
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.warn('⚠️ Warnings:', stderr);
    }
    
    console.log(`✅ ${description} terminé`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur lors de ${description}:`, error.message);
    return false;
  }
}

async function runPerformanceSuite() {
  const results = {
    total: 0,
    successful: 0,
    failed: 0
  };

  // Tests de base (toujours exécutés)
  const basicTests = [
    {
      command: 'node scripts/diagnostic-docker.js',
      description: 'Diagnostic Docker et ressources'
    },
    {
      command: 'node scripts/performance-http-test.js',
      description: 'Tests de performance HTTP'
    }
  ];

  // Tests complets (seulement avec --full)
  const fullTests = fullSuite ? [
    {
      command: 'yarn perf:test',
      description: 'Tests de performance Artillery (si disponible)'
    },
    {
      command: 'yarn test:coverage',
      description: 'Tests unitaires avec couverture'
    }
  ] : [];

  const allTests = [...basicTests, ...fullTests];
  results.total = allTests.length;

  for (const test of allTests) {
    const success = await runCommand(test.command, test.description);
    if (success) {
      results.successful++;
    } else {
      results.failed++;
    }
    
    // Petite pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Résumé final
  console.log('\n📊 RÉSUMÉ DE LA SUITE DE TESTS');
  console.log('═'.repeat(60));
  console.log(`✅ Tests réussis: ${results.successful}/${results.total}`);
  console.log(`❌ Tests échoués: ${results.failed}/${results.total}`);
  console.log(`📈 Taux de réussite: ${((results.successful / results.total) * 100).toFixed(1)}%`);
  
  if (results.successful === results.total) {
    console.log('\n🎉 Tous les tests ont été exécutés avec succès !');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
  }
  
  console.log(`\n📄 Rapport détaillé disponible dans: docs/RAPPORT-PERFORMANCE.md`);
  console.log(`⏰ Durée totale: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60));

  // Code de sortie
  process.exit(results.failed > 0 ? 1 : 0);
}

// Gestion des signaux d'interruption
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Suite de tests interrompue par l\'utilisateur');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Suite de tests terminée');
  process.exit(143);
});

// Affichage de l'aide
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/performance-suite.js [options]

Options:
  --full          Exécute la suite complète de tests (plus long)
  --help, -h      Affiche cette aide

Exemples:
  node scripts/performance-suite.js              # Tests de base
  node scripts/performance-suite.js --full       # Suite complète
  yarn perf:suite                                # Via package.json
  yarn perf:suite:full                          # Suite complète via package.json
`);
  process.exit(0);
}

// Lancement de la suite
runPerformanceSuite().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});