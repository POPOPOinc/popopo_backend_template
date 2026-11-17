import { readFileSync } from "fs"
import { z } from "zod/v4"
import { AlgoliaConfig } from "./algolia-config"

export const ConfigEnv = z.enum(["local", "beta", "dev", "stage", "prod"])

export type ConfigEnv = z.infer<typeof ConfigEnv>

/**
 * 全モジュール共通の設定（単一の正本）。
 *
 * デプロイ環境では infra/conf/{env}.config.encrypted.json（キー名が `!` で終わる値だけを sops で暗号化）、
 * ローカルでは各パッケージの conf/local.json を読む。各モジュールは必要なフィールドを `Config.pick({...})` で切り出して使うこと。
 */
export const Config = z.object({
  env: ConfigEnv,
  firebase: z.object({
    projectId: z.string(),
    storageBucket: z.string(),
    apiKey: z.string(),
  }),
  ops: z.object({
    tenantId: z.string(),
  }),
  web: z.object({
    baseURL: z.string(),
    allowedOrigins: z.string().array(),
  }),
  algolia: AlgoliaConfig,
})

export type Config = z.infer<typeof Config>

/**
 * 設定の JSON を読む。json（Secret Manager から受け取った文字列など）があればそれを、なければ CONFIG_FILE を、
 * どちらもなければ localPath を読む。検証は呼び出し側が自分のスキーマで行う。
 */
export function readConfigJson(localPath: string, json?: string): Record<string, unknown> {
  const raw: unknown = JSON.parse(json ?? readFileSync(process.env.CONFIG_FILE ?? localPath, "utf-8"))
  return z.record(z.string(), z.unknown()).parse(raw)
}
