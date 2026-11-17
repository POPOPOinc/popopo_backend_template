#!/bin/bash
# Firebase Emulator 上で app-server を起動し、integration-test を実行する。
# CI（integration-test-local-emulator.yml）とローカルの両方で使う。
set -euo pipefail
cd "$(dirname "$0")/.."

# pnpm → tsx → node と子プロセスが続くので、別のプロセスグループで起動してグループごと止める（止め残すと次の実行で古いサーバーにつながる）
setsid bash -c 'cd ../app-server && exec pnpm run main:dev api' &
SERVER_PID=$!
trap 'kill -- -$SERVER_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf http://localhost:3000/ > /dev/null && break
  sleep 1
done

pnpm run test:emulator "$@"
