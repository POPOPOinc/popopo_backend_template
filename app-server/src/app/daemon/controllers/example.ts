import { parseArgs } from "node:util"
import { logger, sleepMs } from "lib-server"
import { DaemonDefinition } from "../interface"

export const example: DaemonDefinition = {
  handler: async (args, ctx) => {
    const opts = parseArgs({ args, options: { timeout: { type: "string" } } })
    const timeout = opts.values.timeout ? parseInt(opts.values.timeout) : Infinity
    logger.info("サンプルデーモンを起動しました", { timeoutSeconds: timeout })
    for (let i = 0; i < timeout; i++) {
      if (ctx.abortSignal.aborted) {
        logger.info("サンプルデーモンを中断しました")
        return
      }
      await sleepMs(1000)
    }
  },
}
