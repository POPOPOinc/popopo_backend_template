#!/usr/bin/env node

/**
 * クロスプラットフォーム対応の SSR テンプレート準備スクリプト
 * dist/{env}/index.html を functions/templates/index.html にコピーします
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node prepare-ssr-template.js <env>');
  console.error('Example: node prepare-ssr-template.js localhost');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const sourceFile = path.join(rootDir, 'dist', env, 'index.html');
const targetDir = path.join(rootDir, 'functions', 'templates');
const targetFile = path.join(targetDir, 'index.html');

if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Source file not found: ${sourceFile}`);
  console.error(`Please run "pnpm run build ${env}" first`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✓ Copied ${sourceFile} -> ${targetFile}`);
} catch (error) {
  console.error(`Error copying file: ${error.message}`);
  process.exit(1);
}

try {
  if (fs.existsSync(sourceFile)) {
    fs.unlinkSync(sourceFile);
    console.log(`✓ Removed ${sourceFile} from hosting directory (to ensure requests go through renderHTML)`);
  }
} catch (error) {
  console.warn(`Warning: Could not remove ${sourceFile}: ${error.message}`);
}
