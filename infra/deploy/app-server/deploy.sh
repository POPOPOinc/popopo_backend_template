#!/bin/bash
# app-server の api と job を Cloud Functions (2nd gen) に、daemon を Cloud Run worker pools にデプロイする。
#   env=beta ./infra/deploy/app-server/deploy.sh
# 事前に setup-sops と gcp-login が済んでいること（$GCP_PROJECT が設定される）。
set -e -x
cd "$(dirname "$0")"

ENV="${env:-beta}"

# 設定は Functions のソースアーカイブに含めず、復号したものを Secret Manager の APP_SERVER_CONFIG に新しいバージョンとして登録する。
# 関数側は defineSecret("APP_SERVER_CONFIG") で実行時に受け取る（app-server/src/functions.ts）
# 中身が最新のバージョンと同じなら登録しない（デプロイのたびにバージョンが増えないように）
CONFIG_TMP="$(mktemp)"
CURRENT_TMP="$(mktemp)"
trap 'rm -f "$CONFIG_TMP" "$CURRENT_TMP"' EXIT
sops -d --ignore-mac --output-type=json ../../conf/$ENV.config.encrypted.json > "$CONFIG_TMP"
if gcloud secrets versions access latest --secret=APP_SERVER_CONFIG --project="$GCP_PROJECT" --out-file="$CURRENT_TMP" 2>/dev/null \
  && cmp -s "$CONFIG_TMP" "$CURRENT_TMP"; then
  echo "APP_SERVER_CONFIG is up to date. skip functions:secrets:set"
else
  npx firebase functions:secrets:set APP_SERVER_CONFIG --data-file="$CONFIG_TMP" --force --project="$GCP_PROJECT"
fi
rm -f "$CONFIG_TMP" "$CURRENT_TMP"

cd ../../../app-server
pnpm run build:functions
npx firebase deploy --force --only functions:app-server --project="$GCP_PROJECT"

# daemon: out/ からイメージを作って Artifact Registry に push し、daemons.txt の daemon ごとに worker pool を作る（または更新する）
# worker pools は HTTP を受けない常駐処理向けで、インスタンスが動いている間はずっと課金される
REGION="asia-northeast1"
REPOSITORY="app-server"
IMAGE="$REGION-docker.pkg.dev/$GCP_PROJECT/$REPOSITORY/app-server:$(git rev-parse HEAD)"
# daemon 専用の実行サービスアカウント（作り方と付けるロールは infra/deploy/README.md）
DAEMON_SERVICE_ACCOUNT="app-server-daemon@$GCP_PROJECT.iam.gserviceaccount.com"
if ! gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$REGION" --project="$GCP_PROJECT"
fi
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
pnpm run build
docker build --platform=linux/amd64 -t "$IMAGE" -f ../infra/deploy/app-server/Dockerfile out
docker push "$IMAGE"

grep -v -e '^#' -e '^[[:space:]]*$' ../infra/deploy/app-server/daemons.txt | while read -r DAEMON INSTANCES; do
  NAME="daemon-$(echo "$DAEMON" | sed -E 's/([A-Z])/-\L\1/g')"
  gcloud run worker-pools deploy "$NAME" \
    --image="$IMAGE" \
    --args="daemon,$DAEMON" \
    --instances="$INSTANCES" \
    --cpu=1 \
    --memory=512Mi \
    --set-secrets="APP_SERVER_CONFIG=APP_SERVER_CONFIG:latest" \
    --service-account="$DAEMON_SERVICE_ACCOUNT" \
    --labels="deploy=app-server-daemon" \
    --region="$REGION" \
    --project="$GCP_PROJECT" < /dev/null
done
