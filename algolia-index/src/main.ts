import { AlgoliaAccess } from "lib-server/algolia-access"
import { logger } from "lib-server"
import { config } from "./config"

const algolia = new AlgoliaAccess(config.appId, config["apiKey!"])

const responses = await algolia.setIndexSettings()
logger.info("Algolia のインデックス設定を反映しました", { count: responses.length })
