import * as fs from 'fs';
import * as path from 'path';

// Import replacement mappings
const importReplacements = {
  // Auth controller
  "import authController from '../../../src/modules/auth/auth.controller';": 
    "import { authController } from '../../../src/utils/test-controllers';",
  
  "import * as authController from '../../../src/modules/auth/auth.controller';": 
    "import { authController } from '../../../src/utils/test-controllers';",

  "import { authController } from '../../../src/modules/auth/auth.controller';": 
    "import { authController } from '../../../src/utils/test-controllers';",

  // Event controller  
  "import eventController from '../../../src/modules/event/event.controller';": 
    "import { eventController } from '../../../src/utils/test-controllers';",
  
  "import * as eventController from '../../../src/modules/event/event.controller';": 
    "import { eventController } from '../../../src/utils/test-controllers';",

  "import { eventController } from '../../../src/modules/event/event.controller';": 
    "import { eventController } from '../../../src/utils/test-controllers';",

  // Ticket controller
  "import ticketController from '../../../src/modules/ticket/ticket.controller';": 
    "import { ticketController } from '../../../src/utils/test-controllers';",
  
  "import * as ticketController from '../../../src/modules/ticket/ticket.controller';": 
    "import { ticketController } from '../../../src/utils/test-controllers';",

  "import { ticketController } from '../../../src/modules/ticket/ticket.controller';": 
    "import { ticketController } from '../../../src/utils/test-controllers';",

  // User controller
  "import userController from '../../../src/modules/user/user.controller';": 
    "import { userController } from '../../../src/utils/test-controllers';",
  
  "import * as userController from '../../../src/modules/user/user.controller';": 
    "import { userController } from '../../../src/utils/test-controllers';",

  "import { userController } from '../../../src/modules/user/user.controller';": 
    "import { userController } from '../../../src/utils/test-controllers';",
};

// Specific corrections for method signatures in tests
const methodCallReplacements = {
  // Auth controller method signatures
  'await authController.register(req as NextApiRequest, res as NextApiResponse);': 
    'await authController.register(req as NextApiRequest, res as NextApiResponse);',
  
  'await authController.login(req as NextApiRequest, res as NextApiResponse);': 
    'await authController.login(req as NextApiRequest, res as NextApiResponse);',
};

/**
 * Corriger un fichier de test spécifique
 */
function fixTestFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Appliquer les corrections d'imports
    for (const [oldImport, newImport] of Object.entries(importReplacements)) {
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
        hasChanges = true;
        console.log(`✅ Fixed import in ${filePath}`);
      }
    }

    // Apply method corrections
    for (const [oldCall, newCall] of Object.entries(methodCallReplacements)) {
      if (content.includes(oldCall)) {
        content = content.replace(new RegExp(oldCall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newCall);
        hasChanges = true;
        console.log(`✅ Fixed method call in ${filePath}`);
      }
    }

    // Save if changes were made
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

/**
 * Parcourir et corriger tous les fichiers de tests
 */
function fixAllTestFiles(testDir: string): void {
  try {
    const files = fs.readdirSync(testDir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(testDir, file.name);
      
      if (file.isDirectory()) {
        // Recurse into subdirectories
        fixAllTestFiles(fullPath);
      } else if (file.name.endsWith('.test.ts') || file.name.endsWith('.spec.ts')) {
        // Process test files
        const fixed = fixTestFile(fullPath);
        if (fixed) {
          console.log(`🔧 Updated: ${fullPath}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${testDir}:`, error);
  }
}

// Exporter les fonctions pour usage externe
export { fixAllTestFiles, fixTestFile, importReplacements, methodCallReplacements };

// If executed directly
if (require.main === module) {
  const testDirectory = path.join(__dirname, '../../tests');
  console.log('🚀 Starting Phase 2D test file corrections...');
  console.log(`📁 Processing test directory: ${testDirectory}`);
  
  fixAllTestFiles(testDirectory);
  
  console.log('✅ Phase 2D corrections completed!');
}

export default {
  fixTestFile,
  fixAllTestFiles,
  importReplacements,
  methodCallReplacements
};
