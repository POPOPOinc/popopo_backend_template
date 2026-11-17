import { App, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { Config, readConfigJson } from "lib-server/config/config"

/** エミュレータに対して実行しているか（apply:emulator が FIRESTORE_EMULATOR_HOST を渡す） */
export const isEmulator = "FIRESTORE_EMULATOR_HOST" in process.env

/** デプロイ環境に対して実行しているか（infra/deploy/migration/deploy.sh が CONFIG_FILE を渡す） */
export const isRemote = !isEmulator && ("CONFIG_FILE" in process.env || "CI" in process.env)

let app: App
if (isRemote) {
  app = initializeApp()
} else {
  // エミュレータでは demo- プレフィックスのプロジェクト ID を使うと、実プロジェクトへの接続が起きない
  app = initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-template" })
}

export const firebase = app
export const firestore = getFirestore(app)
// Entity の optional フィールドを undefined のまま渡せるようにする。app-server など他サブシステムと同様の挙動。
firestore.settings({ ignoreUndefinedProperties: true })

// 共通の設定スキーマ（lib-server）から必要なフィールドだけ切り出す。
// フィールドを独自に再宣言せず pick することで、同一ファイルに対する型の乖離を防ぐ。
const MigrationConfig = Config.pick({ env: true, ops: true })

export const config = { ...MigrationConfig.parse(readConfigJson(`${import.meta.dirname}/../conf/local.json`)), isEmulator, isRemote }
