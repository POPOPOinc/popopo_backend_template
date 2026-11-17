#!/usr/bin/env node

/**
 * .well-known/assetlinks.json ファイルを生成するスクリプト
 * Android App Links 用の設定を環境ごとに生成します
 *
 * Usage: node generate-assetlinks.cjs <env>
 * Example: node generate-assetlinks.cjs localhost
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2];

if (!env) {
  console.error('Error: Environment name is required');
  console.error('Usage: node generate-assetlinks.cjs <env>');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist', env);
const wellKnownDir = path.join(distDir, '.well-known');
const outputPath = path.join(wellKnownDir, 'assetlinks.json');

if (!fs.existsSync(distDir)) {
  console.error(`Error: Dist directory not found: ${distDir}`);
  console.error(`Please run "pnpm run build:mode ${env}" first`);
  process.exit(1);
}

// 環境ごとの Android パッケージと署名証明書の SHA-256 フィンガープリント。自分のアプリの値に置き換えてください
// 各環境では対応するアプリのみを含める（本番環境に開発用のパッケージが露出しないように）
const PLACEHOLDER_FINGERPRINT = "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";
const ANDROID_PACKAGES_BY_ENV = {
  localhost: [
    { package_name: "com.example.app.beta", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] },
    { package_name: "com.example.app.dev", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] },
    { package_name: "com.example.app.stage", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] },
  ],
  beta: [{ package_name: "com.example.app.beta", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] }],
  dev: [{ package_name: "com.example.app.dev", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] }],
  stage: [{ package_name: "com.example.app.stage", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] }],
  prod: [{ package_name: "com.example.app", sha256_cert_fingerprints: [PLACEHOLDER_FINGERPRINT] }],
};

const ANDROID_PACKAGES = ANDROID_PACKAGES_BY_ENV[env];

if (!ANDROID_PACKAGES) {
  console.error(`Error: Unknown environment: ${env}`);
  console.error(`Valid environments: ${Object.keys(ANDROID_PACKAGES_BY_ENV).join(', ')}`);
  process.exit(1);
}

const content = ANDROID_PACKAGES.map((pkg) => ({
  relation: [
    "delegate_permission/common.handle_all_urls",
    "delegate_permission/common.get_login_creds",
  ],
  target: {
    namespace: "android_app",
    package_name: pkg.package_name,
    sha256_cert_fingerprints: pkg.sha256_cert_fingerprints,
  },
}));

fs.mkdirSync(wellKnownDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(content, null, 2) + '\n');
console.log(`Generated ${outputPath} (${ANDROID_PACKAGES.length} Android packages)`);
