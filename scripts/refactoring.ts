#!/usr/bin/env ts-node

/**
 * Script de refactorisation automatique
 * Migre l'ancien système de configuration vers le nouveau
 */

import * as fs from 'fs';
import * as path from 'path';

interface RefactoringStats {
  filesProcessed: number;
  importsUpdated: number;
  configMigrated: number;
  errors: string[];
}

class RefactoringService {
  private stats: RefactoringStats = {
    filesProcessed: 0,
    importsUpdated: 0,
    configMigrated: 0,
    errors: []
  };

  async run() {
    console.log('🚀 Démarrage de la refactorisation...');
    
    try {
      // Phase 1: Migration des imports de configuration
      await this.migrateConfigImports();
      
      // Phase 2: Mise à jour des services
      await this.updateServiceImports();
      
      // Phase 3: Nettoyage des anciens fichiers
      await this.cleanupOldFiles();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Erreur lors de la refactorisation:', error);
      this.stats.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Migrer les imports de configuration
   */
  private async migrateConfigImports() {
    console.log('📝 Migration des imports de configuration...');
    
    const filesToUpdate = [
      'src/server.ts',
      'src/modules/**/*.ts',
      'src/services/**/*.ts',
      'src/lib/**/*.ts'
    ];

    for (const pattern of filesToUpdate) {
      const files = await this.findFiles(pattern);
      
      for (const file of files) {
        await this.updateConfigImports(file);
      }
    }
  }

  /**
   * Mettre à jour les imports dans un fichier
   */
  private async updateConfigImports(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let updatedContent = content;

      // Remplacer les anciens imports
      const replacements = [
        {
          old: /import.*from.*['"]\.\.\/config\/.*['"];?/g,
          new: "import { CONFIG } from '@/core/config';"
        },
        {
          old: /import.*from.*['"]\.\.\/lib\/constants['"];?/g,
          new: "import { CONFIG } from '@/core/config';"
        },
        {
          old: /process\.env\.([A-Z_]+)/g,
          new: (match: string, envVar: string) => {
            // Mapper les variables d'environnement vers la nouvelle config
            const configMap: Record<string, string> = {
              'PORT': 'CONFIG.SERVER.PORT',
              'NODE_ENV': 'CONFIG.ENV',
              'UPLOAD_BASE_DIR': 'CONFIG.UPLOAD.BASE_DIR',
              'MAX_FILE_SIZE': 'CONFIG.UPLOAD.MAX_SIZE',
              'CACHE_TTL': 'CONFIG.CACHE.TTL'
            };
            
            return configMap[envVar] || match;
          }
        }
      ];

      let hasChanges = false;
      
      for (const replacement of replacements) {
        if (typeof replacement.new === 'string') {
          if (replacement.old.test(updatedContent)) {
            updatedContent = updatedContent.replace(replacement.old, replacement.new);
            hasChanges = true;
          }
        } else {
          const newContent = updatedContent.replace(replacement.old, replacement.new);
          if (newContent !== updatedContent) {
            updatedContent = newContent;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        fs.writeFileSync(filePath, updatedContent);
        this.stats.importsUpdated++;
        console.log(`✅ Mis à jour: ${filePath}`);
      }

      this.stats.filesProcessed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.stats.errors.push(`Erreur dans ${filePath}: ${errorMessage}`);
      console.warn(`⚠️ Impossible de traiter ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Mettre à jour les imports des services
   */
  private async updateServiceImports() {
    console.log('🔄 Mise à jour des imports de services...');
    
    // Ici on peut ajouter la logique pour remplacer
    // les imports vers AdminService par les nouveaux services spécialisés
    
    const servicesMapping = {
      'AdminService': {
        userManagement: 'UserManagementService',
        eventManagement: 'EventManagementService',
        analytics: 'AnalyticsService'
      }
    };

    // Implementation à développer selon les besoins
  }

  /**
   * Nettoyer les anciens fichiers (optionnel)
   */
  private async cleanupOldFiles() {
    console.log('🧹 Nettoyage des anciens fichiers...');
    
    const filesToArchive = [
      'src/lib/constants.ts', // Si entièrement remplacé
      'docker-compose.override.yml', // Remplacé par docker-compose.dev.yml
    ];

    for (const file of filesToArchive) {
      if (fs.existsSync(file)) {
        const backupFile = `${file}.backup.${Date.now()}`;
        fs.renameSync(file, backupFile);
        console.log(`📦 Archivé: ${file} → ${backupFile}`);
      }
    }
  }

  /**
   * Trouver les fichiers correspondant à un pattern
   */
  private async findFiles(pattern: string): Promise<string[]> {
    // Implémentation simplifiée
    // Dans un vrai projet, utiliser un package comme 'glob'
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };

    if (pattern.includes('src/')) {
      walkDir('src');
    }

    return files;
  }

  /**
   * Afficher les résultats
   */
  private printResults() {
    console.log('\n📊 Résultats de la refactorisation:');
    console.log(`✅ Fichiers traités: ${this.stats.filesProcessed}`);
    console.log(`🔄 Imports mis à jour: ${this.stats.importsUpdated}`);
    console.log(`⚙️ Configurations migrées: ${this.stats.configMigrated}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`⚠️ Erreurs: ${this.stats.errors.length}`);
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n🎉 Refactorisation terminée !');
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const service = new RefactoringService();
  service.run().catch(console.error);
}

export default RefactoringService;
