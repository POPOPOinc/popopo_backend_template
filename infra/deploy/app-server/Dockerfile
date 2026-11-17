# app-server の daemon を Cloud Run worker pools で動かすイメージ。
# ビルドコンテキストは app-server/out（`pnpm -C app-server run build` の成果物。依存は esbuild で 1 ファイルにまとめてある）
FROM node:24.22.1-slim

ENV TZ="Asia/Tokyo" NODE_ENV=production

# Cloud Run の第 2 世代の実行環境では、ENTRYPOINT のプロセスが PID 1 になる（https://cloud.google.com/run/docs/container-contract）。
# PID 1 はハンドラを登録していないシグナルを無視するので、node が SIGTERM のハンドラを登録する前に SIGTERM が来ると、10 秒後の SIGKILL まで止まらない。
# tini を PID 1 にして、node にシグナルを中継させる
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

COPY . /app/

USER node

# 起動モードとdaemon名は worker pool の args で渡す（例: daemon consumeSyncUserToAlgoliaTask）
ENTRYPOINT ["/usr/bin/tini", "--", "node", "--enable-source-maps", "/app/main.js"]
