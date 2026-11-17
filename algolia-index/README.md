# algolia-index

Algolia のインデックス設定（検索対象属性・レプリカ・カスタムランキング）をデプロイします。設定内容は `lib-server/src/algolia-access.ts` の `AlgoliaAccess.setIndexSettings` に定義されています。

## 実行方法

1. `conf/local.json.template` を `conf/local.json` にコピーし、App ID と Admin API Key を記入します（`conf/local.json` は `.gitignore` 済みです）
2. `pnpm run apply` を実行します

設定ファイルの場所は環境変数 `CONFIG_FILE` で変更できます（デプロイでは `infra/deploy/algolia-index/deploy.sh` が `infra/conf/{env}.config.encrypted.json` を復号して渡します）。
