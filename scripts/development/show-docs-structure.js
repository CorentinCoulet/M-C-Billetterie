#!/usr/bin/env node

/**
 * Script pour afficher l'organisation de la documentation
 */

const fs = require('fs');
const path = require('path');

function displayDocumentationStructure() {
  console.log('📚 Documentation - Billetterie Platform');
  console.log('=====================================\n');

  const docsPath = path.join(__dirname, '..', 'docs');
  
  try {
    const files = fs.readdirSync(docsPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    console.log('🗂️  Structure organisée :');
    console.log('   📁 /docs/ - Toute la documentation technique\n');
    
    console.log('📋 Documents disponibles :\n');
    
    const fileDescriptions = {
      '_INDEX.md': '🔍 Index et navigation rapide',
      'README.md': '📖 Guide principal et vue d\'ensemble', 
      'QR_SYSTEM.md': '🔐 Système QR codes sécurisés',
      'EMAIL_SYSTEM.md': '📧 Templates emails et service SMTP',
      'SECURITY.md': '🛡️  Guide de sécurité complet',
      'CHANGELOG.md': '📝 Historique des versions',
      'CONTRIBUTING.md': '🤝 Guide pour contributeurs'
    };

    markdownFiles.forEach(file => {
      const description = fileDescriptions[file] || '📄 Document';
      const filePath = path.join(docsPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      console.log(`   ${description}`);
      console.log(`      📁 docs/${file} (${sizeKB}KB)`);
      console.log('');
    });

    console.log('🎯 Points d\'entrée recommandés :\n');
    console.log('   1. 📋 docs/README.md - Vue d\'ensemble générale');
    console.log('   2. 🔍 docs/_INDEX.md - Navigation par thème');
    console.log('   3. 🚀 README.md (racine) - Quick start\n');

    console.log('✅ Organisation terminée avec succès !');
    console.log('   • Documentation centralisée dans /docs/');
    console.log('   • README principal simplifié à la racine'); 
    console.log('   • Index de navigation créé');
    console.log('   • Guides thématiques organisés\n');

    console.log('📖 Pour naviguer :');
    console.log('   • Commencez par le README.md principal');
    console.log('   • Explorez /docs/ pour la doc technique');
    console.log('   • Utilisez _INDEX.md pour navigation rapide\n');

  } catch (error) {
    console.error('❌ Erreur lors de la lecture des fichiers:', error.message);
  }
}

if (require.main === module) {
  displayDocumentationStructure();
}

module.exports = { displayDocumentationStructure };
