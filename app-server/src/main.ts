import { logger } from "lib-server"
import { default as api } from "./app/api/main"
import { default as daemon } from "./app/daemon/main"
import { default as daemonAll } from "./app/daemon/main-for-local-debug"
import { default as job } from "./app/job/main"

/** コマンドライン引数のサブコマンドで起動モードを切り替える */
const args = process.argv.slice(2)
const command = args.shift()

switch (command) {
  case undefined:
  case "api":
    api(args)
    break
  case "job":
    job(args)
    break
  case "daemon":
    daemon(args)
    break
  case "daemon-all":
    daemonAll(args)
    break
  default:
    logger.error("不明なコマンドです", undefined, undefined, { command })
    process.exit(1)
}
