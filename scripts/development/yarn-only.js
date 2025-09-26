#!/usr/bin/env node

/**
 * Script to automatically redirect npm to yarn
 * Prevents accidental npm usage errors
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

console.log('🚨 This project uses YARN exclusively!');
console.log('❌ npm is not recommended for this project');
console.log('');

if (!command) {
  console.log('✅ Use instead:');
  console.log('   yarn install    - To install dependencies');
  console.log('   yarn dev        - To start development');
  console.log('   yarn build      - To build the project');
  console.log('   yarn add <pkg>  - To add a dependency');
  process.exit(1);
}

// npm -> yarn mappings
const npmToYarn = {
  'install': 'install',
  'i': 'install',
  'run': '',
  'start': 'start',
  'test': 'test',
  'build': 'build',
  'dev': 'dev'
};

let yarnCommand = 'yarn';
if (npmToYarn[command] !== undefined) {
  if (npmToYarn[command]) {
    yarnCommand += ` ${npmToYarn[command]}`;
  }
  if (args.length > 1) {
    yarnCommand += ` ${args.slice(1).join(' ')}`;
  }
  
  console.log(`✅ Auto-conversion: ${yarnCommand}`);
  console.log('');
  
  try {
    execSync(yarnCommand, { stdio: 'inherit' });
  } catch (error) {
    process.exit(error.status);
  }
} else {
  console.log(`❓ Unknown command: ${command}`);
  console.log('✅ Try: yarn --help');
  process.exit(1);
}