#!/bin/bash
# migration を GitHub Actions のランナー上で実行する。
#   env=beta ./infra/deploy/migration/deploy.sh
set -e -x
cd "$(dirname "$0")"

ENV="${env:-beta}"
CONF_DIR="$(pwd)/conf"

mkdir -p "$CONF_DIR"
sops -d --ignore-mac --output-type=json ../../conf/$ENV.config.encrypted.json > "$CONF_DIR/config.json"

cd ../../../migration
CONFIG_FILE="$CONF_DIR/config.json" \
GCLOUD_PROJECT="$GCP_PROJECT" \
  pnpm run apply:remote
