const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fonction pour corriger un fichier de route
function fixRouteFile(filePath) {
  try {
    console.log(`Fixing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Supprimer l'import de createMethodHandler
    content = content.replace(/,?\s*createMethodHandler,?/g, '');
    content = content.replace(/createMethodHandler,?\s*/g, '');
    
    // Nettoyer les imports vides
    content = content.replace(/import\s*{\s*,?\s*}\s*from.*?;/g, '');
    content = content.replace(/import\s*{\s*([^}]*?),\s*}\s*from/g, 'import { $1 } from');
    content = content.replace(/import\s*{\s*,\s*([^}]*?)\s*}\s*from/g, 'import { $1 } from');
    
    // Chercher le pattern export default createMethodHandler
    const exportMatch = content.match(/export\s+default\s+createMethodHandler\s*\(\s*{\s*([^}]+)\s*}\s*\)\s*;?/s);
    
    if (exportMatch) {
      const methodsStr = exportMatch[1];
      const methods = [];
      
      // Extraire les méthodes et leurs handlers
      const methodRegex = /(\w+):\s*([^,]+)/g;
      let match;
      while ((match = methodRegex.exec(methodsStr)) !== null) {
        const method = match[1];
        const handler = match[2].trim();
        methods.push({ method, handler });
      }
      
      // Générer les exports individuels
      let newExports = '';
      for (const { method, handler } of methods) {
        // Trouver la fonction handler dans le contenu
        const functionRegex = new RegExp(`(async\\s+)?function\\s+${handler}\\s*\\([^)]*\\)\\s*{[^}]*(?:{[^}]*}[^}]*)*}`, 's');
        const funcMatch = content.match(functionRegex);
        
        if (funcMatch) {
          // Remplacer la déclaration de fonction par un export
          const funcDeclaration = funcMatch[0];
          const newFunc = funcDeclaration.replace(`function ${handler}`, `export async function ${method}`);
          
          // Remplacer dans le contenu
          content = content.replace(funcDeclaration, newFunc);
          
          // Supprimer l'ancien export default
          content = content.replace(/export\s+default\s+createMethodHandler\s*\(\s*{[^}]+}\s*\)\s*;?/s, '');
        }
      }
    }
    
    // Nettoyer les lignes vides en trop
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Chercher tous les fichiers de route
const routeFiles = glob.sync('app/api/**/route.ts', { cwd: process.cwd() });

console.log(`Found ${routeFiles.length} route files to fix`);

routeFiles.forEach(file => {
  const fullPath = path.resolve(file);
  fixRouteFile(fullPath);
});

console.log('Done fixing route files');
