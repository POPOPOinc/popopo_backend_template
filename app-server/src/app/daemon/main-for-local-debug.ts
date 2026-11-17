/**
 * ローカル環境で一発でできる限り全部のデーモンが立ち上がって欲しい！という気持ちを叶えてくれる便利なmain関数
 * 一個でもクラッシュすると全部クラッシュする
 *
 * ローカルでのデバッグでしか使ってはいけない
 */

import { logger } from "lib-server"
import { Core } from "../../core"
import { daemonDefinitions } from "./main"
import { styleText } from "node:util"
import { setMaxListeners } from "events"

const excludeDaemonNames: (keyof typeof daemonDefinitions)[] = [
  "example",
]

const errorOnSigterm = "SIGTERM" as const

export default function(args: string[]): void {
  setMaxListeners(100) // デーモンが多いとイベントリスナーの数が増えるので、上限を引き上げる
  logger.info("ローカルサーバーを起動しています...", { args: args.join(",") })

  const abortController = new AbortController()

  process.on("uncaughtException", (error) => {
    logger.error("キャッチされない例外が発生しました", error)
    process.exit(1)
  })

  process.on("unhandledRejection", cause => {
    logger.error("ハンドルされていない例外が発生しました", cause)
  })

  process.on("SIGTERM", () => {
    logger.info("SIGTERMを受信しました。デーモンのシャットダウンを開始します")
    abortController.abort(errorOnSigterm)
  })

  ;(async () => {
    Core.initialize()
    await Promise.all(
      Object.entries(daemonDefinitions)
        .filter(([daemonName]) => !excludeDaemonNames.includes(daemonName as keyof typeof daemonDefinitions))
        .map(async ([daemonName, daemonDef]) => {
          logger.info("デーモンを開始します", { daemonName })
          await daemonDef.handler([], {
            abortSignal: abortController.signal,
          })
        })
    )
  })().then(() => {
    process.exit(0)
  }).catch((e) => {
    if (e === errorOnSigterm) {
      logger.info("SIGTERMによりデーモンが終了しました")
      process.exit(0)
    } else {
      logger.error("デーモンの実行に失敗しました", e)
      // このファイルはローカル開発専用で、全デーモンを起動しているときにひとつでも停止すると、このブロックに入り、他のものが処理が途中でも全デーモンが停止させられる。
      // ローカル開発時はこのファイルをtsx watchで起動するが、process exitしても全停止していることが特に表示されるわけでもないので状態をわかりやすくするために手動で赤文字の文章を出力する。
      // eslint-disable-next-line no-console
      console.error(styleText("red", "All daemon processes have terminated. Update files or hit Enter to restart."))
      process.exit(1)
    }
  })

}
