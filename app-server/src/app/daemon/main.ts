import { logger, runWithLoggerContext } from "lib-server"
import { Core } from "../../core"
import { consumeSyncPostToAlgoliaTask } from "./controllers/consume-sync-post-to-algolia-task"
import { consumeSyncUserToAlgoliaTask } from "./controllers/consume-sync-user-to-algolia-task"
import { example } from "./controllers/example"
import { updatePostDisplayPeriod } from "./controllers/update-post-display-period"
import { DaemonDefinition } from "./interface"
import { createDaemonLoggerContext } from "./logger/logger-context"

export const daemonDefinitions = {
  consumeSyncPostToAlgoliaTask,
  consumeSyncUserToAlgoliaTask,
  example,
  updatePostDisplayPeriod,
} as const

const _daemonDefinitions: Record<string, DaemonDefinition> = daemonDefinitions

const errorOnSigterm = "SIGTERM" as const

export default function(args: string[]): void {
  const abortController = new AbortController()

  const daemonName = args[0]
  if (daemonName == null) {
    throw new Error("Daemon name is required")
  }
  const daemonDef = _daemonDefinitions[daemonName]
  if (daemonDef == null) {
    throw new Error(`Daemon not found: ${daemonName}`)
  }

  const daemonArgs = args.slice(1)
  const loggerContext = createDaemonLoggerContext(daemonName)

  process.on("uncaughtException", (error) => {
    runWithLoggerContext(loggerContext, () => {
      logger.error("キャッチされていない例外", error)
      process.exit(1)
    })
  })

  process.on("unhandledRejection", cause => {
    runWithLoggerContext(loggerContext, () => {
      logger.error("未処理の例外", cause)
    })
  })

  process.on("SIGTERM", () => {
    runWithLoggerContext(loggerContext, () => {
      logger.info("SIGTERMを受信しました。デーモンのシャットダウンを開始します")
      abortController.abort(errorOnSigterm)
    })
  })

  void runWithLoggerContext(loggerContext, async () => {
    logger.info("デーモンを開始します", { daemonName })

    try {
      Core.initialize()
      await daemonDef.handler(daemonArgs, {
        abortSignal: abortController.signal,
      })
      logger.info("デーモンが完了しました", { daemonName })
      process.exit(0)
    } catch (e) {
      if (e === errorOnSigterm) {
        logger.info("SIGTERMによりデーモンが終了しました")
        process.exit(0)
      } else {
        logger.error("デーモンの実行に失敗しました", e)
        process.exit(1)
      }
    }
  })
}
