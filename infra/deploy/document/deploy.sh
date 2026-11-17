#!/bin/bash
# document（スキーマ・API ドキュメント）を Firebase Hosting にデプロイする。
#   env=beta ./infra/deploy/document/deploy.sh
set -e -x
cd "$(dirname "$0")/../../../document"

pnpm run build
npx firebase deploy --only "hosting:your-project-${env:-beta}-document" --project="$GCP_PROJECT"
