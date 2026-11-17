#!/usr/bin/env node

/**
 * CSS パス生成スクリプト
 * Vite の manifest.json から CSS ファイルパスを読み取り、
 * functions/src/generated/css-paths.ts を生成します
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node generate-css-paths.js <env>');
  console.error('Example: node generate-css-paths.js localhost');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const manifestPath = path.join(rootDir, 'dist', env, '.vite', 'manifest.json');
const outputDir = path.join(rootDir, 'functions', 'src', 'generated');
const outputPath = path.join(outputDir, 'css-paths.ts');

const ifMissing = process.argv.includes('--if-missing');
if (ifMissing && fs.existsSync(outputPath)) {
  process.exit(0);
}
if (!fs.existsSync(manifestPath) && ifMissing) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, 'export const mainCssPath = "";\n', 'utf-8');
  process.exit(0);
}
if (!fs.existsSync(manifestPath)) {
  console.error(`Error: Manifest file not found: ${manifestPath}`);
  console.error(`Please run "pnpm run build ${env}" first`);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // index.html エントリから CSS パスを取得
  const indexEntry = manifest['index.html'];
  if (!indexEntry || !indexEntry.css || indexEntry.css.length === 0) {
    console.error('Error: No CSS found in manifest for index.html entry');
    process.exit(1);
  }
  
  // メインの CSS ファイルパスを取得
  const mainCssPath = '/' + indexEntry.css[0];
  
  // 出力ディレクトリを作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }
  
  // TypeScript ファイルを生成
  const content = `/**
 * このファイルは自動生成されています。直接編集しないでください。
 * 生成元: scripts/generate-css-paths.js
 */

/** メインの CSS ファイルパス（Vite manifest.json から取得） */
export const mainCssPath = "${mainCssPath}";
`;
  
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✓ Generated ${outputPath}`);
  console.log(`  mainCssPath: ${mainCssPath}`);
} catch (error) {
  console.error(`Error generating CSS paths: ${error.message}`);
  process.exit(1);
}
