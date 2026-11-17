#!/bin/bash
# 暗号化した設定を編集する（復号した状態でエディタが開き、保存時に再暗号化される）
#   ./edit.sh        --> beta.config.encrypted.json
#   ./edit.sh stage  --> stage.config.encrypted.json
set -eu
cd "$(dirname "${BASH_SOURCE:-$0}")"

ENV="${1:-beta}"
FILE="$ENV.config.encrypted.json"
if [[ ! -f "$FILE" ]]; then
  echo "$FILE が見つかりません" 1>&2
  exit 1
fi

SOPS_AGE_KEY_FILE="keys-$ENV.txt" sops --ignore-mac "$FILE"
