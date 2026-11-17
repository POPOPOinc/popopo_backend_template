import { logger } from "lib-server"
import { Config, readConfigJson } from "lib-server/config/config"

// CONFIG_FILE がなければ conf/local.json（.gitignore 済み。conf/local.json.template をコピーして作る）を読む
const AlgoliaIndexConfig = Config.pick({ algolia: true })

let parsed
try {
  parsed = AlgoliaIndexConfig.safeParse(readConfigJson(`${import.meta.dirname}/../conf/local.json`))
} catch (cause) {
  logger.error("設定ファイルの解析に失敗しました", cause)
  process.exit(-1)
}

if (!parsed.success) {
  logger.error("設定ファイルのバリデーションに失敗しました", parsed.error)
  process.exit(-1)
}

export const config = parsed.data.algolia
