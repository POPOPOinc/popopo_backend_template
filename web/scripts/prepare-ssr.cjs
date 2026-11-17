#!/usr/bin/env node

/**
 * SSR準備の統合スクリプト
 * 1. CSSパスを生成
 * 2. SSRテンプレートをコピー
 * 3. publicアセットをコピー
 */

const { execSync } = require('child_process');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node prepare-ssr.js <env>');
  console.error('Example: node prepare-ssr.js localhost');
  process.exit(1);
}

const scriptsDir = __dirname;

try {
  console.log('Step 1: Generating CSS paths from manifest...');
  execSync(`node "${path.join(scriptsDir, 'generate-css-paths.cjs')}" ${env}`, {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..')
  });

  console.log('\nStep 2: Copying SSR template...');
  execSync(`node "${path.join(scriptsDir, 'prepare-ssr-template.cjs')}" ${env}`, {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..')
  });

  console.log('\nStep 3: Copying public assets...');
  execSync(`node "${path.join(scriptsDir, 'copy-public-assets.cjs')}" ${env}`, {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..')
  });

  console.log('\n✓ SSR preparation completed successfully');
} catch (error) {
  console.error('\n✗ SSR preparation failed');
  process.exit(1);
}
