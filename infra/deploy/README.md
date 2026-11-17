# infra/deploy

`.github/actions/deploy` から `env={beta,dev,stage,prod} ./infra/deploy/{app}/deploy.sh` として呼ばれるデプロイスクリプトです。
実行前に `setup-sops`（復号鍵の配置）と `gcp-login`（OIDC / Workload Identity Federation でのログイン。`$GCP_PROJECT` が設定される）が済んでいる必要があります。

| app | デプロイ先 | 設定 |
| --- | --- | --- |
| app-server | Cloud Functions (2nd gen)。`api`（onRequest で Express を包む）と `reindexAlgolia`（onSchedule）。daemon は Cloud Run worker pools（下記） | `[env].config.encrypted.json` を復号して Secret Manager の `APP_SERVER_CONFIG` に置く |
| migration | GitHub Actions ランナー上で実行 | `[env].config.encrypted.json` を復号して `CONFIG_FILE` で渡す |
| algolia-index | GitHub Actions ランナー上で実行 | `[env].config.encrypted.json` を復号して `CONFIG_FILE` で渡す |
| document | Firebase Hosting（target `document`） | なし |

app-server の設定は、Functions のソースアーカイブに平文が入らないよう、ファイル全体を Secret Manager の `APP_SERVER_CONFIG` に置きます。`deploy.sh` が `firebase functions:secrets:set` で新しいバージョンを登録し、関数は `defineSecret("APP_SERVER_CONFIG")` で実行時に環境変数として受け取ります（`app-server/src/functions.ts`）。デプロイに使うサービスアカウントには Secret Manager の管理権限（`roles/secretmanager.admin`）が必要です。

設定の中身が最新のバージョンと同じときは、`deploy.sh` は新しいバージョンを登録しません（比較には runner に入っている `gcloud secrets versions access` を使います）。中身を変えてデプロイすると古いバージョンが残るので、関数がもう参照していないバージョンは `npx firebase functions:secrets:prune --project=<project>` で無効にしてください（`--dry-run` で対象を確認できます）。

web / manage / firebase（rules・indexes）はそれぞれ `deploy-web.yml` / `deploy-manage.yml` / `firebase-deploy.yml` でデプロイします。

## daemon は Cloud Run worker pools で動かす

app-server の daemon は、[`daemons.txt`](./app-server/daemons.txt) に書いた daemon ごとに 1 つの [Cloud Run worker pool](https://cloud.google.com/run/docs/deploy-worker-pools)（`daemon-<kebab-case の名前>`）で常駐させます。元の構成で daemon ごとに k8s の Deployment を分けていたのに合わせています。

**worker pool はインスタンスが動いている間ずっと課金されます**（リクエストの有無に関係なく、インスタンスの起動から停止まで。[課金の設定](https://cloud.google.com/run/docs/configuring/billing-settings)）。daemon を 1 つ足すと、そのぶん常時課金が増えます。

- **イメージ:** `deploy.sh` が `pnpm -C app-server run build` の成果物（`app-server/out/main.js`。依存を 1 ファイルにまとめたもの）から [`Dockerfile`](./app-server/Dockerfile) でイメージを作り、Artifact Registry（`asia-northeast1-docker.pkg.dev/<project>/app-server/app-server:<commit>`）に push します。リポジトリがなければ作ります。
- **起動:** worker pool の args で `daemon <daemon 名>` を渡します。インスタンス数は `daemons.txt` の値で固定です（worker pools は手動スケーリング）。
  - 元の構成では、scale する daemon（`TaskConsumer` を使うもの）だけを HPA で増やし（最大 2）、それ以外は 1 台にしていました。worker pools は CPU 使用率で自動では増えないので、並列にしたい daemon だけインスタンス数を上げてください。
- **設定:** Functions と同じ Secret Manager の `APP_SERVER_CONFIG` を、`--set-secrets` で環境変数として受け取ります（`latest` を参照するので、設定を変えたときは再デプロイで反映されます）。
- **停止:** Cloud Run は停止の前に SIGTERM を送り、10 秒後に SIGKILL します（[コンテナのランタイムの契約](https://cloud.google.com/run/docs/container-contract)）。daemon は SIGTERM で `AbortSignal` を abort し、処理中のアイテム（タスク）を終えたところでループを抜けて終了します（[`daemon/main.ts`](../../app-server/src/app/daemon/main.ts)）。第 2 世代の実行環境ではコンテナのプロセスが PID 1 になるので、起動直後の SIGTERM を取りこぼさないよう、イメージでは [tini](https://github.com/krallin/tini) を PID 1 にしています。10 秒を超えて SIGKILL された場合も、タスクはロック（既定 5 分）が切れると再び処理されます。
- **一覧の確認:** `daemons.txt` と `daemonDefinitions` の一致は、`pnpm -C app-server run check`（[`check-daemon-config-consistency.mjs`](../../app-server/scripts/check-daemon-config-consistency.mjs)）が確かめます。デプロイしない daemon は、そのスクリプトの除外リストに理由つきで書きます。
- **daemon を消すとき:** `daemons.txt` から消しても worker pool は残るので、`gcloud run worker-pools delete daemon-<名前> --region=asia-northeast1` で消してください。

### service ではなく worker pools にした理由

- worker pools は、HTTP を受けない常駐処理のための Cloud Run のリソースで、2026-04-14 に GA になりました（[リリースノート](https://cloud.google.com/run/docs/release-notes)、[リソースの比較](https://cloud.google.com/run/docs/resource-model)）。
- service で動かすには、ヘルスチェックのために `PORT` で listen し、インスタンスベースの課金（旧 `--no-cpu-throttling`）と最小インスタンス数 1 を設定する必要があります。daemon は HTTP を受けないので、worker pools の方が余計な listener を持たずに済みます。
- どちらも Terraform なしで `gcloud run ... deploy` から作成・更新できます（[`gcloud run worker-pools deploy`](https://cloud.google.com/sdk/gcloud/reference/run/worker-pools/deploy)）。Firebase CLI は Cloud Run を扱えないので、`deploy.sh` では runner に入っている gcloud を使います。

### デプロイに使うサービスアカウントの権限

GitHub Actions が OIDC でログインするサービスアカウント（`infra/conf/[env].gha.yml` の `gcp-oidc.service_account`）には、Functions のための権限に加えて次が必要です。

| ロール | 用途 |
| --- | --- |
| `roles/run.developer` | worker pool の作成・更新 |
| `roles/artifactregistry.writer` | イメージの push（リポジトリを `deploy.sh` に作らせる場合は `roles/artifactregistry.admin`。先に作っておけば writer で足ります） |
| `roles/iam.serviceAccountUser`（daemon の実行サービスアカウント `app-server-daemon` に対してだけ） | worker pool に実行サービスアカウントを割り当てる |

ロールは [worker pool のデプロイに必要なロール](https://cloud.google.com/run/docs/deploy-worker-pools#required_roles) に合わせています（イメージを読む `roles/artifactregistry.reader` は、push に使う writer / admin に含まれます）。

### daemon の実行サービスアカウント

`--service-account` を指定しないと、Cloud Run は Compute Engine のデフォルトのサービスアカウント（`PROJECT_NUMBER-compute@developer.gserviceaccount.com`）で worker pool を動かします。公式ドキュメントは、このアカウントを使わず、必要な権限だけを持つアカウントを作るよう勧めています（[サービス ID の概要](https://cloud.google.com/run/docs/securing/service-identity)）。

そのため `deploy.sh` は、daemon 専用のサービスアカウント `app-server-daemon@<project>.iam.gserviceaccount.com` を `--service-account` で指定します。最初に 1 回だけ作り、次のロールを付けてください。

| ロール | 付ける先 | 用途 |
| --- | --- | --- |
| `roles/secretmanager.secretAccessor` | Secret Manager の `APP_SERVER_CONFIG` | 起動時に設定を環境変数として受け取る |
| `roles/datastore.user` | プロジェクト | Firestore（`tasks`・`posts` など）の読み書き |

```sh
gcloud iam service-accounts create app-server-daemon --project=<project>
gcloud secrets add-iam-policy-binding APP_SERVER_CONFIG --project=<project> \
  --member=serviceAccount:app-server-daemon@<project>.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding <project> \
  --member=serviceAccount:app-server-daemon@<project>.iam.gserviceaccount.com --role=roles/datastore.user
```

daemon に Firestore 以外の Google Cloud のリソース（Storage など）を使わせるときは、そのぶんのロールをこのアカウントに足してください。Algolia は API キー（`APP_SERVER_CONFIG` の中）で呼ぶので、ロールは要りません。
