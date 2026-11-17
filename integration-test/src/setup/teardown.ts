import { exec } from "child_process"
import { promisify } from "util"
import { isEmulator, logger } from "../core"

const execAsync = promisify(exec)

export default async (): Promise<void> => {
  // エミュレータ環境で API サーバー / Firebase エミュレータが動いているかチェックする
  if (isEmulator()) {
    try {
      const { stdout: apiProcess } = await execAsync("curl -s http://localhost:3000/ > /dev/null 2>&1 && echo 'running' || true")
      const isApiServerRunning = apiProcess.trim() === "running"
      const { stdout: firebaseProcess } = await execAsync("ps aux | grep 'emulators:' | grep -v grep || true")
      const isFirebaseEmulatorRunning = 0 < firebaseProcess.trim().length

      const errors = [
        ...(isApiServerRunning ? [] : ["api-server"]),
        ...(isFirebaseEmulatorRunning ? [] : ["firebase-emulator"]),
      ]

      if (0 < errors.length) {
        logger.warn("=".repeat(70))
        logger.warn(`${errors.join(",")} が起動していません。テストが失敗する可能性があります。`)
        logger.warn("=".repeat(70))
      }
    } catch (error) {
      logger.warn("プロセスの起動確認に失敗しました", error)
    }
  }
}
