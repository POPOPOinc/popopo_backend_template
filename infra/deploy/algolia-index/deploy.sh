#!/bin/bash
# Algolia のインデックス設定を GitHub Actions のランナー上で反映する。
#   env=beta ./infra/deploy/algolia-index/deploy.sh
set -e -x
cd "$(dirname "$0")"

ENV="${env:-beta}"
CONF_DIR="$(pwd)/conf"

mkdir -p "$CONF_DIR"
sops -d --ignore-mac --output-type=json ../../conf/$ENV.config.encrypted.json > "$CONF_DIR/config.json"

cd ../../../algolia-index
CONFIG_FILE="$CONF_DIR/config.json" \
pnpm run apply
