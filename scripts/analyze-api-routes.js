#!/usr/bin/env node

/**
 * Script to analyze API routes and identify used patterns
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'app', 'api');
const RESULTS = {
  total: 0,
  standardized: 0, // Uses createMethodHandler
  withAuth: 0, // Uses withAuth
  direct: 0, // Direct export of functions
  routes: []
};

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  const analysis = {
    path: relativePath,
    pattern: 'unknown',
    methods: [],
    hasAuth: false,
    hasValidation: false,
    hasLogger: false,
    hasConsoleLog: false,
    priority: 'low'
  };

  // Detect HTTP methods
  const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    analysis.methods.push(match[1]);
  }

  // Detect createMethodHandler pattern
  if (content.includes('createMethodHandler')) {
    analysis.pattern = 'createMethodHandler';
    RESULTS.standardized++;
  }
  // Detect withAuth
  else if (content.includes('withAuth')) {
    analysis.pattern = 'withAuth';
    RESULTS.withAuth++;
  }
  // Direct export
  else if (analysis.methods.length > 0) {
    analysis.pattern = 'direct';
    RESULTS.direct++;
  }

  // Check helper usage
  analysis.hasAuth = content.includes('withAuth') || content.includes('withAdminAuth');
  analysis.hasValidation = content.includes('validateBody');
  analysis.hasLogger = content.includes('logger.') && !content.includes('console.');
  analysis.hasConsoleLog = content.includes('console.log') || content.includes('console.error');

  // Determine refactoring priority
  const isAuthRoute = relativePath.includes('api/auth');
  const isOrderRoute = relativePath.includes('api/orders');
  const isPaymentRoute = relativePath.includes('api/payments');
  const isTicketRoute = relativePath.includes('api/tickets');
  const isEventRoute = relativePath.includes('api/events');
  
  if (analysis.pattern !== 'createMethodHandler') {
    if (isAuthRoute || isPaymentRoute || isOrderRoute) {
      analysis.priority = 'critical';
    } else if (isTicketRoute || isEventRoute) {
      analysis.priority = 'high';
    } else {
      analysis.priority = 'medium';
    }
  }

  return analysis;
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      RESULTS.total++;
      const analysis = analyzeFile(fullPath);
      RESULTS.routes.push(analysis);
    }
  }
}

function generateReport() {
  console.log('\n📊 API ROUTES ANALYSIS\n');
  console.log('═'.repeat(80));
  console.log(`Total routes: ${RESULTS.total}`);
  console.log(`✅ Standardized (createMethodHandler): ${RESULTS.standardized}`);
  console.log(`⚠️  With withAuth but not createMethodHandler: ${RESULTS.withAuth}`);
  console.log(`❌ Direct pattern (to migrate): ${RESULTS.direct}`);
  console.log('═'.repeat(80));

  // Group by priority
  const critical = RESULTS.routes.filter(r => r.priority === 'critical' && r.pattern !== 'createMethodHandler');
  const high = RESULTS.routes.filter(r => r.priority === 'high' && r.pattern !== 'createMethodHandler');
  const medium = RESULTS.routes.filter(r => r.priority === 'medium' && r.pattern !== 'createMethodHandler');

  console.log('\n🔴 CRITICAL PRIORITY (do first)\n');
  if (critical.length === 0) {
    console.log('  ✅ No critical routes to refactor!');
  } else {
    critical.forEach(route => {
      console.log(`  📄 ${route.path}`);
      console.log(`     Pattern: ${route.pattern} | Methods: ${route.methods.join(', ')}`);
      console.log(`     Auth: ${route.hasAuth ? '✅' : '❌'} | Validation: ${route.hasValidation ? '✅' : '❌'} | Logger: ${route.hasLogger ? '✅' : '❌'}`);
      if (route.hasConsoleLog) console.log('     ⚠️  Contains console.log');
      console.log('');
    });
  }

  console.log('\n🟡 HIGH PRIORITY\n');
  if (high.length === 0) {
    console.log('  ✅ No high priority routes to refactor!');
  } else {
    high.forEach(route => {
      console.log(`  📄 ${route.path}`);
      console.log(`     Pattern: ${route.pattern} | Methods: ${route.methods.join(', ')}`);
      console.log(`     Auth: ${route.hasAuth ? '✅' : '❌'} | Logger: ${route.hasLogger ? '✅' : '❌'}`);
      console.log('');
    });
  }

  console.log('\n🟢 MEDIUM PRIORITY\n');
  console.log(`  ${medium.length} routes to refactor progressively\n`);

  // Statistics
  console.log('\n📈 STATISTICS\n');
  const routesWithLogger = RESULTS.routes.filter(r => r.hasLogger).length;
  const routesWithConsoleLog = RESULTS.routes.filter(r => r.hasConsoleLog).length;
  const routesWithAuth = RESULTS.routes.filter(r => r.hasAuth).length;
  const routesWithValidation = RESULTS.routes.filter(r => r.hasValidation).length;

  console.log(`  Logger used: ${routesWithLogger}/${RESULTS.total} (${Math.round(routesWithLogger/RESULTS.total*100)}%)`);
  console.log(`  Console.log present: ${routesWithConsoleLog}/${RESULTS.total} (${Math.round(routesWithConsoleLog/RESULTS.total*100)}%)`);
  console.log(`  With authentication: ${routesWithAuth}/${RESULTS.total} (${Math.round(routesWithAuth/RESULTS.total*100)}%)`);
  console.log(`  With Zod validation: ${routesWithValidation}/${RESULTS.total} (${Math.round(routesWithValidation/RESULTS.total*100)}%)`);

  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('  1. Start with critical routes (auth, payments, orders)');
  console.log('  2. Use createMethodHandler for all routes');
  console.log('  3. Replace console.log with logger');
  console.log('  4. Add withAuth for protected routes');
  console.log('  5. Validate inputs with validateBody + Zod');
  console.log('\n');

  // Save JSON report
  const reportPath = path.join(__dirname, '..', 'api-routes-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(RESULTS, null, 2));
  console.log(`📝 Detailed report saved: ${reportPath}\n`);
}

// Execution
try {
  if (!fs.existsSync(API_DIR)) {
    console.error('❌ app/api directory not found');
    process.exit(1);
  }

  scanDirectory(API_DIR);
  generateReport();
} catch (error) {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
}
