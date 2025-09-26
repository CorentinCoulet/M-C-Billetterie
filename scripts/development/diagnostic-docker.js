const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function analyzeDockerResources() {
  console.log('🔍 ANALYSE DES RESSOURCES DOCKER');
  console.log('═'.repeat(50));
  
  try {
    // Stats des conteneurs
    console.log('\n📊 Utilisation des ressources par conteneur:');
    const { stdout: stats } = await execPromise('docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}"');
    console.log(stats);
    
    // Logs récents de l'application
    console.log('\n📝 Logs récents de l\'application (dernières 20 lignes):');
    try {
      const { stdout: logs } = await execPromise('docker logs --tail 20 billetterie-app-dev');
      console.log(logs || 'Aucun log disponible');
    } catch (error) {
      console.log('❌ Impossible de récupérer les logs:', error.message);
    }
    
    // Informations sur les conteneurs
    console.log('\n🐳 Informations détaillées des conteneurs:');
    const { stdout: containers } = await execPromise('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');
    console.log(containers);
    
  } catch (error) {
    console.log('❌ Erreur lors de l\'analyse Docker:', error.message);
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  TEST DE CONNEXION BASE DE DONNÉES');
  console.log('═'.repeat(50));
  
  try {
    // Test de connectivité PostgreSQL
    const { stdout: pgTest } = await execPromise('docker exec postgres-dev pg_isready -U postgres');
    console.log('✅ PostgreSQL:', pgTest.trim());
    
    // Test Redis
    const { stdout: redisTest } = await execPromise('docker exec redis-dev redis-cli ping');
    console.log('✅ Redis:', redisTest.trim());
    
  } catch (error) {
    console.log('❌ Erreur de test DB:', error.message);
  }
}

async function checkDockerSystem() {
  console.log('\n⚙️  SYSTÈME DOCKER');
  console.log('═'.repeat(50));
  
  try {
    // Informations système Docker
    const { stdout: system } = await execPromise('docker system df');
    console.log('💾 Utilisation de l\'espace Docker:');
    console.log(system);
    
    // Version Docker
    const { stdout: version } = await execPromise('docker version --format "{{.Server.Version}}"');
    console.log(`🐳 Version Docker: ${version.trim()}`);
    
  } catch (error) {
    console.log('❌ Erreur système Docker:', error.message);
  }
}

async function runDiagnostic() {
  console.log('🔧 DIAGNOSTIC AVANCÉ - APPLICATION DOCKER');
  console.log('═'.repeat(60));
  
  await analyzeDockerResources();
  await testDatabaseConnection();
  await checkDockerSystem();
  
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('─'.repeat(40));
  console.log('1. 🚀 Si CPU/Mémoire élevés → Augmenter les ressources Docker');
  console.log('2. 🗄️  Si DB lente → Vérifier les index et requêtes SQL');
  console.log('3. 🔧 Si premier chargement lent → Problème de cold start');
  console.log('4. 📦 Considérer l\'ajout de cache Redis pour les pages');
  console.log('5. 🏗️  Optimiser le build Next.js (SSG/ISR)');
  
  console.log('\n⏰ Diagnostic terminé:', new Date().toLocaleString());
  console.log('═'.repeat(60));
}

runDiagnostic().catch(console.error);