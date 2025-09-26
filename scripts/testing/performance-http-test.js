const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_ROUTES = [
  { path: '/', name: 'Page d\'accueil' },
  { path: '/events', name: 'Page événements' },
  { path: '/about', name: 'Page à propos' },
  { path: '/contact', name: 'Page contact' },
  { path: '/faq', name: 'Page FAQ' },
  { path: '/login', name: 'Page connexion' },
  { path: '/dashboard', name: 'Dashboard (peut nécessiter auth)' },
  { path: '/api/health', name: 'API Health (si disponible)' }
];

const ITERATIONS = 5; // Augmenté à 5 pour plus de précision

// Fonction pour faire une requête HTTP et mesurer le temps
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const urlObj = new URL(url);
    const module = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Performance-Test-Script/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      },
      timeout: 40000 // 15 secondes de timeout
    };

    const req = module.request(options, (res) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          responseTime: responseTime,
          contentLength: Buffer.byteLength(data, 'utf8'),
          headers: res.headers,
          ttfb: responseTime // Time To First Byte
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      reject({
        error: error.message,
        responseTime: endTime - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Timeout',
        responseTime: 15000
      });
    });

    req.end();
  });
}

// Fonction pour tester une route plusieurs fois
async function testRoute(route) {
  console.log(`\n🔍 Test de ${route.name} (${route.path})`);
  console.log('─'.repeat(60));
  
  const results = [];
  const url = BASE_URL + route.path;
  
  for (let i = 1; i <= ITERATIONS; i++) {
    try {
      console.log(`   Test ${i}/${ITERATIONS}...`);
      const result = await makeRequest(url);
      results.push(result);
      
      const statusEmoji = result.status === 200 ? '✅' : result.status < 400 ? '⚠️' : '❌';
      console.log(`   ${statusEmoji} Status: ${result.status} | Temps: ${result.responseTime.toFixed(0)}ms | Taille: ${(result.contentLength / 1024).toFixed(1)}KB`);
      
      // Petite pause entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.error} | Temps: ${error.responseTime?.toFixed(0) || 'N/A'}ms`);
      results.push({ error: error.error, responseTime: error.responseTime || 0 });
      
      // Pause plus longue en cas d'erreur
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { route, results };
}

// Fonction pour calculer les statistiques
function calculateStats(results) {
  const validResults = results.filter(r => !r.error && r.responseTime && r.status < 400);
  if (validResults.length === 0) return null;
  
  const times = validResults.map(r => r.responseTime);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  // Calcul de la médiane
  const sortedTimes = [...times].sort((a, b) => a - b);
  const median = sortedTimes.length % 2 === 0
    ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
    : sortedTimes[Math.floor(sortedTimes.length / 2)];
  
  // Calcul de l'écart-type
  const variance = times.reduce((acc, time) => acc + Math.pow(time - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return { 
    avg, 
    min, 
    max, 
    median,
    stdDev,
    successRate: (validResults.length / results.length) * 100,
    totalRequests: results.length,
    successfulRequests: validResults.length
  };
}

// Fonction pour évaluer les performances
function evaluatePerformance(avgTime) {
  if (avgTime < 100) return { level: '🟢', text: 'EXCELLENTE', description: 'Très rapide !' };
  if (avgTime < 300) return { level: '🟡', text: 'BONNE', description: 'Performance satisfaisante' };
  if (avgTime < 800) return { level: '🟠', text: 'MOYENNE', description: 'Peut être améliorée' };
  if (avgTime < 2000) return { level: '🔴', text: 'LENTE', description: 'Nécessite optimisation' };
  return { level: '💀', text: 'TRÈS LENTE', description: 'Problème critique !' };
}

// Test de charge rapide
async function quickLoadTest(url) {
  console.log('\n⚡ Test de charge rapide (10 requêtes simultanées)...');
  const promises = Array(10).fill().map(() => makeRequest(url));
  
  try {
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const avgTime = results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value.responseTime, 0) / successful;
    
    console.log(`   ✅ ${successful}/10 requêtes réussies`);
    console.log(`   ⏱️  Temps moyen sous charge: ${avgTime?.toFixed(0) || 'N/A'}ms`);
    
    return { successful, avgTime, total: 10 };
  } catch (error) {
    console.log(`   ❌ Erreur lors du test de charge: ${error.message}`);
    return null;
  }
}

// Fonction principale
async function runPerformanceTests() {
  console.log('🚀 DÉBUT DES TESTS DE PERFORMANCE');
  console.log('═'.repeat(70));
  console.log(`🌐 URL de base: ${BASE_URL}`);
  console.log(`🔄 Itérations par route: ${ITERATIONS}`);
  console.log(`⏰ Heure de début: ${new Date().toLocaleString()}`);
  
  // Test de connectivité préliminaire
  console.log('\n🔍 Test de connectivité...');
  try {
    const connectTest = await makeRequest(BASE_URL);
    console.log(`✅ Serveur accessible - Status: ${connectTest.status} (${connectTest.responseTime.toFixed(0)}ms)`);
  } catch (error) {
    console.log(`❌ Impossible de se connecter au serveur: ${error.error}`);
    console.log('   Vérifiez que l\'application Docker est bien démarrée.');
    return;
  }
  
  const allResults = [];
  
  for (const route of TEST_ROUTES) {
    const routeResults = await testRoute(route);
    allResults.push(routeResults);
  }
  
  // Test de charge sur la page d'accueil
  const loadTestResult = await quickLoadTest(BASE_URL + '/');
  
  // Résumé des résultats
  console.log('\n📊 RÉSUMÉ DES PERFORMANCES');
  console.log('═'.repeat(70));
  
  let totalTests = 0;
  let totalSuccessful = 0;
  let allTimes = [];
  
  allResults.forEach(({ route, results }) => {
    const stats = calculateStats(results);
    totalTests += results.length;
    
    if (stats && stats.successfulRequests > 0) {
      totalSuccessful += stats.successfulRequests;
      allTimes.push(...results.filter(r => !r.error && r.status < 400).map(r => r.responseTime));
      
      const perf = evaluatePerformance(stats.avg);
      
      console.log(`\n📄 ${route.name}:`);
      console.log(`   • Temps moyen: ${stats.avg.toFixed(0)}ms`);
      console.log(`   • Médiane: ${stats.median.toFixed(0)}ms`);
      console.log(`   • Min/Max: ${stats.min.toFixed(0)}ms / ${stats.max.toFixed(0)}ms`);
      console.log(`   • Écart-type: ±${stats.stdDev.toFixed(0)}ms`);
      console.log(`   • Succès: ${stats.successfulRequests}/${stats.totalRequests} (${stats.successRate.toFixed(1)}%)`);
      console.log(`   • ${perf.level} Performance: ${perf.text} - ${perf.description}`);
    } else {
      console.log(`\n📄 ${route.name}: ❌ AUCUNE RÉPONSE VALIDE`);
    }
  });
  
  // Statistiques globales
  if (allTimes.length > 0) {
    const globalAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    const globalMin = Math.min(...allTimes);
    const globalMax = Math.max(...allTimes);
    const globalSuccessRate = (totalSuccessful / totalTests) * 100;
    
    console.log('\n🌍 STATISTIQUES GLOBALES:');
    console.log('─'.repeat(50));
    console.log(`   • Temps de réponse moyen: ${globalAvg.toFixed(0)}ms`);
    console.log(`   • Plage de temps: ${globalMin.toFixed(0)}ms - ${globalMax.toFixed(0)}ms`);
    console.log(`   • Taux de succès: ${globalSuccessRate.toFixed(1)}%`);
    
    if (loadTestResult) {
      console.log(`   • Performance sous charge: ${loadTestResult.avgTime?.toFixed(0) || 'N/A'}ms`);
      console.log(`   • Stabilité: ${loadTestResult.successful}/${loadTestResult.total} requêtes`);
    }
    
    console.log('\n💡 DIAGNOSTIC:');
    if (globalAvg < 200) {
      console.log('   🎉 Excellentes performances ! Votre application est très rapide.');
      console.log('   👍 Ce n\'est pas votre PC qui est lent, c\'est le code qui est optimisé.');
    } else if (globalAvg < 500) {
      console.log('   ✅ Bonnes performances pour une application web moderne.');
      console.log('   📱 Les temps de chargement sont acceptables sur mobile et desktop.');
    } else if (globalAvg < 1500) {
      console.log('   ⚠️  Performances correctes mais améliorables.');
      console.log('   🔍 Points à vérifier:');
      console.log('      - Optimisation des images et assets');
      console.log('      - Code splitting et lazy loading');
      console.log('      - Cache et CDN');
    } else {
      console.log('   🐌 L\'application semble lente. Causes possibles:');
      console.log('      - Requêtes base de données non optimisées');
      console.log('      - Ressources Docker limitées (CPU/RAM)');
      console.log('      - Code JavaScript non optimisé');
      console.log('      - Absence de cache');
    }
    
    // Comparaison avec les standards web
    console.log('\n📊 COMPARAISON STANDARDS WEB:');
    console.log(`   • Google PageSpeed cible: < 2500ms (${globalAvg < 2500 ? '✅' : '❌'})`);
    console.log(`   • Bonne UX (< 1000ms): ${globalAvg < 1000 ? '✅' : '❌'}`);
    console.log(`   • Excellente UX (< 300ms): ${globalAvg < 300 ? '✅' : '❌'}`);
  }
  
  console.log(`\n⏰ Durée totale des tests: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(70));
}

// Lancer les tests
console.log('🔧 Outil de diagnostic de performance - Billetterie App\n');
runPerformanceTests().catch(console.error);