import type { Request, Response } from "express"
import { defineSecret } from "firebase-functions/params"
import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"

/**
 * Cloud Functions (2nd gen) のエントリーポイント。ローカルでは src/main.ts の api / job / daemon で起動する。
 *
 * 設定（infra/conf/{env}.config.encrypted.json を復号したもの）は Secret Manager の APP_SERVER_CONFIG に置き、defineSecret で実行時に環境変数として受け取る
 * （ソースアーカイブに平文を含めないため）。デプロイ時の関数の解析ではシークレットが読めないので、
 * 設定を読む Core と Express アプリは関数が呼ばれたときに初めて読み込む。
 */
const region = "asia-northeast1"
const appConfig = defineSecret("APP_SERVER_CONFIG")

let core: Promise<typeof import("./core")> | undefined
const loadCore = async () => {
  core ??= import("./core").then(module => {
    module.Core.initialize()
    return module
  })
  return await core
}

let server: Promise<(req: Request, res: Response) => void> | undefined
const loadServer = async () => {
  server ??= loadCore().then(async () => (await import("./app/api/main")).createServer())
  return await server
}

export const api = onRequest({ region, timeoutSeconds: 600, secrets: [appConfig] }, async (req, res) => {
  (await loadServer())(req, res)
})

export const reindexAlgolia = onSchedule({ region, schedule: "every day 04:00", timeZone: "Asia/Tokyo", secrets: [appConfig] }, async () => {
  await loadCore()
  const { jobDefinitions } = await import("./app/job/main")
  await jobDefinitions.reindexAlgolia.handler([])
})
