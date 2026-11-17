# infra

GitHub Actions からバックエンドの各サービスを Firebase / GCP にデプロイするための設定とスクリプトです。

## フォルダー構造

- [conf](./conf)
  - `{env}.config.encrypted.json`: その環境の設定（プロジェクト ID、テナント ID、API キーなど）を 1 つにまとめたファイル。[SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age) で、キー名が `!` で終わる値だけを暗号化してコミットする
  - `example.config.json`: 上のファイルの書き方の例（平文、値はダミー）
  - `{env}.gha.yml`: GitHub Actions のログイン先（Workload Identity Federation）の設定。秘匿情報は含めない
  - `edit.sh` / `edit.bat`: 暗号化済みファイルの編集
- [deploy](./deploy)/{app}/deploy.sh: `.github/actions/deploy` から呼ばれるデプロイスクリプト（[deploy/README.md](./deploy/README.md)）

`{env}` は `beta` / `dev` / `stage` / `prod` です。ブランチと環境は 1 対 1 に対応し、`beta` ブランチへの push で beta 環境にデプロイされます（`deploy-on-push.yml` → `deploy-all.yml`）。

設定のスキーマは `lib-server/src/config/config.ts` の `Config` 1 つだけです。各サービスは起動時に `CONFIG_FILE` のファイル（ローカルでは各パッケージの `conf/local.json`）を読み、`Config.pick({...})` で必要なフィールドだけを Zod で検証します。

## 秘匿情報の設定キー

秘匿情報と、そうでない設定を別のファイルに分けず、1 つのファイルに書きます。キー名が `!` で終わる設定キーは秘匿情報とみなされ、`.sops.yaml` の `encrypted_regex: "!$"` により値だけが暗号化されます。それ以外の値、キー名、構造は平文のまま残るので、差分をレビューできます。

```json
{
  "env": "beta",
  "firebase": { "projectId": "your-project-beta", "storageBucket": "your-project-beta.firebasestorage.app", "apiKey": "..." },
  "ops": { "tenantId": "your-ops-tenant-id" },
  "web": { "baseURL": "https://beta.example.com/", "allowedOrigins": ["https://beta.example.com"] },
  "algolia": { "appId": "YOUR_ALGOLIA_APP_ID", "apiKey!": "xxxxxxxx" }
}
```

## はじめに: age 鍵を用意する

このリポジトリには鍵も暗号化済みの設定も含まれていません。各自で環境ごとに鍵を作ります。

```shell
# sops と age をインストール（macOS の例）
brew install sops age

# 環境ごとに鍵を作成する（keys-*.txt は .gitignore 済み）
cd infra/conf
age-keygen -o keys-beta.txt
age-keygen -o keys-dev.txt
age-keygen -o keys-stage.txt
age-keygen -o keys-prod.txt

# 公開鍵を確認し、リポジトリ直下の .sops.yaml の age: のダミー値を置き換える
grep 'public key' keys-*.txt
```

秘密鍵（`AGE-SECRET-KEY-...` の行）は、パスワードマネージャーなどで管理し、GitHub の Repository secrets に `SOPS_KEY_BETA` / `SOPS_KEY_DEV` / `SOPS_KEY_STAGE` / `SOPS_KEY_PROD` として登録します。CI では `.github/actions/setup-sops` が SOPS をインストール（チェックサム検証あり）して鍵を配置します。

## 設定ファイルを作る・編集する

```shell
cd infra/conf

# 初回: 例をコピーして値を書き、暗号化する（*.decrypted.json は .gitignore 済み）
cp example.config.json beta.config.decrypted.json
sops --encrypt --input-type json --output-type json beta.config.decrypted.json > beta.config.encrypted.json
rm beta.config.decrypted.json

# 編集（復号した状態でエディタが開き、保存時に再暗号化される）
./edit.sh beta

# 内容の確認
SOPS_AGE_KEY_FILE=keys-beta.txt sops -d beta.config.encrypted.json
```

### 鍵を更新する

```shell
age-keygen -o new-keys-beta.txt
# .sops.yaml の公開鍵を新しいものに置き換えてから、既存ファイルの鍵を付け替える
SOPS_AGE_KEY_FILE=keys-beta.txt sops updatekeys beta.config.encrypted.json
```

GitHub の secret `SOPS_KEY_BETA` も新しい秘密鍵に更新します。

## GitHub の設定

| 種類 | 名前 | 内容 |
| --- | --- | --- |
| Secrets | `SOPS_KEY_BETA` / `SOPS_KEY_DEV` / `SOPS_KEY_STAGE` / `SOPS_KEY_PROD` | age の秘密鍵 |
| Secrets | `SLACK_BOT_TOKEN` | デプロイ通知（任意） |
| Secrets | `ALGOLIA_API_KEY_FOR_TEST` | エミュレータでの統合テスト用（任意） |
| Variables | `SLACK_DEPLOY_CHANNEL_ID` | デプロイ通知先（任意） |
| Variables | `ALGOLIA_APP_ID_FOR_TEST` | エミュレータでの統合テスト用（任意） |

GCP 側では Workload Identity Federation のプールとプロバイダ、デプロイ用サービスアカウント（Firebase Admin、Cloud Functions Admin など）を作り、`conf/{env}.gha.yml` に設定します。
