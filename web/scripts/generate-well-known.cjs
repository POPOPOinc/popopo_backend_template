#!/usr/bin/env node

/**
 * .well-known/apple-app-site-association ファイルを生成するスクリプト
 * schema のルート定義から iOS Universal Links 用のパスを生成します
 *
 * Usage: node generate-well-known.cjs <env>
 * Example: node generate-well-known.cjs localhost
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node generate-well-known.cjs <env>');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist', env);
const wellKnownDir = path.join(distDir, '.well-known');
const outputPath = path.join(wellKnownDir, 'apple-app-site-association');

if (!fs.existsSync(distDir)) {
  console.error(`Error: Dist directory not found: ${distDir}`);
  console.error(`Please run "pnpm run build:mode ${env}" first`);
  process.exit(1);
}

// 環境ごとの iOS App ID（<Team ID>.<Bundle ID>）。自分のアプリの値に置き換えてください
// 各環境では対応するアプリのみを含める（本番環境に開発用の App ID が露出しないように）
const IOS_APP_IDS_BY_ENV = {
  localhost: ["TEAMID.com.example.app.beta", "TEAMID.com.example.app.dev", "TEAMID.com.example.app.stage"],
  beta: ["TEAMID.com.example.app.beta"],
  dev: ["TEAMID.com.example.app.dev"],
  stage: ["TEAMID.com.example.app.stage"],
  prod: ["TEAMID.com.example.app"],
};

const IOS_APP_IDS = IOS_APP_IDS_BY_ENV[env];

if (!IOS_APP_IDS) {
  console.error(`Error: Unknown environment: ${env}`);
  console.error(`Valid environments: ${Object.keys(IOS_APP_IDS_BY_ENV).join(', ')}`);
  process.exit(1);
}

const routesDir = path.join(rootDir, '..', 'schema', 'src', 'routes');

/** schema の locales を読む（TypeScript を実行せずに正規表現で抽出する） */
function extractLocales() {
  const content = fs.readFileSync(path.join(routesDir, 'types.ts'), 'utf-8');
  const match = /export const locales[^=]*=\s*\[([^\]]*)\]/.exec(content);
  if (!match) {
    console.error('Error: locales not found in schema/src/routes/types.ts');
    process.exit(1);
  }
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

/**
 * ルートパターンを iOS Universal Links 用のワイルドカードパターンに変換する
 * 例: "/users/:userId" → "/users/*"
 */
function patternToUniversalLinkPath(pattern) {
  return pattern.replace(/:([^/]+)/g, "*");
}

/** ルート定義ファイルから pattern: "..." を抽出する */
function extractPatternsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const patternRegex = /pattern:\s*["']([^"']+)["']/g;
  const patterns = [];
  let match;
  while ((match = patternRegex.exec(content)) !== null) {
    if (match[1].startsWith('/')) {
      patterns.push(match[1]);
    }
  }
  return patterns;
}

const langs = extractLocales();
const patterns = extractPatternsFromFile(path.join(routesDir, 'definitions.ts'));
if (patterns.length === 0) {
  console.error('Error: No patterns found in route definitions');
  process.exit(1);
}

// 各パターンについて、言語つき（/{lang}/...）と言語なしの両方を含める
const paths = [];
for (const pattern of patterns) {
  const wildcardPath = patternToUniversalLinkPath(pattern);
  for (const lang of langs) {
    paths.push(`/${lang}${wildcardPath}`);
  }
  paths.push(wildcardPath);
}

const content = {
  applinks: {
    apps: [],
    details: IOS_APP_IDS.map((appID) => ({ appID, paths })),
  },
};

fs.mkdirSync(wellKnownDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));
console.log(`Generated ${outputPath} (${IOS_APP_IDS.length} app IDs, ${paths.length} paths)`);
