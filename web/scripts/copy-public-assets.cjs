#!/usr/bin/env node

/**
 * クロスプラットフォーム対応の public アセットコピースクリプト
 * public/ 内のすべてのファイルを dist/{env}/ にコピーします
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node copy-public-assets.js <env>');
  console.error('Example: node copy-public-assets.js localhost');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist', env);

if (!fs.existsSync(publicDir)) {
  console.error(`Error: Public directory not found: ${publicDir}`);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  console.error(`Error: Dist directory not found: ${distDir}`);
  console.error(`Please run "pnpm run build ${env}" first`);
  process.exit(1);
}

/**
 * 再帰的にディレクトリをコピーする
 * @param {string} src - コピー元ディレクトリ
 * @param {string} dest - コピー先ディレクトリ
 */
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath);
    } else {
      if (entry.name === 'index.html' && fs.existsSync(destPath)) {
        console.log(`⊘ Skipped ${srcPath} (already exists in dist)`);
        continue;
      }
      
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied ${srcPath} -> ${destPath}`);
    }
  }
}

try {
  copyRecursive(publicDir, distDir);
  console.log(`✓ Successfully copied public assets to ${distDir}`);
} catch (error) {
  console.error(`Error copying public assets: ${error.message}`);
  process.exit(1);
}
