import deepmerge from "deepmerge"
import { readFileSync } from "fs"
import { logger } from "lib-server"
import { Config, readConfigJson } from "lib-server/config/config"
import { Env } from "./env"

let loaded
try {
  // ローカルではファイル（CONFIG_FILE、なければ conf/local.json）から、Cloud Functions では Secret Manager（APP_SERVER_CONFIG）から読む
  const base = readConfigJson(`${__dirname}/../conf/local.json`, Env.configJson)

  let override = {}

  if (Env.configFileOverride) {
    // override 用のファイルは今の所ローカル用なので、存在しなくてもエラーが出ても気にしない
    try {
      override = JSON.parse(readFileSync(Env.configFileOverride, "utf8"))
    } catch (cause) {
      logger.error(`オーバーライド設定ファイルの読み込みまたはパースに失敗しました。無視します。`, cause)
    }
  }

  loaded = deepmerge(base, override)
} catch (cause) {
  logger.error("設定ファイルのパースに失敗しました", cause)
  process.exit(-1)
}

const parsed = Config.safeParse(loaded)

if (!parsed.success) {
  logger.error("設定ファイルのバリデーションに失敗しました", parsed.error)
  process.exit(-1)
}

export const config: Config = parsed.data
