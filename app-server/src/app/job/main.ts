import { logger } from "lib-server"
import { Core } from "../../core"
import { reindexAlgolia } from "./controllers/reindex-algolia"
import { JobDefinition } from "./interface"

export const jobDefinitions: Record<string, JobDefinition> = {
  reindexAlgolia,
}

export default function(args: string[]): void {
  process.on("uncaughtException", (error) => {
    logger.error("キャッチされていない例外", error)
    process.exit(1)
  })
  process.on("unhandledRejection", (cause) => {
    logger.error("未処理の例外", cause)
    process.exit(1)
  })

  const jobName = args.shift()
  const job = jobName ? jobDefinitions[jobName] : undefined
  if (!job) {
    logger.error("不明なジョブです", undefined, undefined, { jobName, available: Object.keys(jobDefinitions) })
    process.exit(1)
  }
  Core.initialize()
  job.handler(args).then(() => {
    process.exit(0)
  }).catch(cause => {
    logger.error("ジョブが失敗しました", cause, undefined, { jobName })
    process.exit(1)
  })
}
