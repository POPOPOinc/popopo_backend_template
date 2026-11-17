import { spawn } from "child_process"
import { mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * デーモンを起動し、条件が満たされるかタイムアウトするまで待機する。
 * タイムアウト時はエラーにせず、conditionMet: false で resolve する（テスト側で判断）
 *
 * デーモンはローカル設定（app-server/conf/local.json）で起動し、エミュレータに接続する。
 * 実環境（beta 以降）では daemon をテストから起動できないため、testOnlyEmulator の中で使う。
 *
 * @param daemonName デーモン名（app-server/src/app/daemon/main.ts の daemonDefinitions のキー）
 * @param condition 条件をチェックする関数（true を返すと完了）
 * @param options.configOverride app-server の設定に deepmerge する値（CONFIG_FILE_OVERRIDE）
 */
export async function runDaemonUntilMatchingTheCondition(
  daemonName: string,
  condition: () => Promise<boolean>,
  options: { timeoutMs?: number, pollIntervalMs?: number, configOverride?: object } = {},
): Promise<{ stdout: string, stderr: string, conditionMet: boolean }> {
  const { timeoutMs = 30000, pollIntervalMs = 500, configOverride = {} } = options
  const overrideFile = join(mkdtempSync(join(tmpdir(), "daemon-runner-")), "config.override.json")
  writeFileSync(overrideFile, JSON.stringify(configOverride))

  const child = spawn(
    "pnpm",
    ["exec", "tsx", "src/main.ts", "daemon", daemonName],
    {
      cwd: `${process.cwd()}/../app-server`,
      stdio: "pipe",
      // pnpm → tsx → node と子プロセスが続くので、別のプロセスグループで起動してグループごと止める
      detached: true,
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080",
        FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
        FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? "127.0.0.1:9199",
        CONFIG_FILE_OVERRIDE: overrideFile,
        // app-server の設定ファイルは local 設定を使う
        CONFIG_FILE: undefined,
      },
    },
  )

  let stdout = ""
  let stderr = ""
  child.stdout?.on("data", data => { stdout += data.toString() })
  child.stderr?.on("data", data => { stderr += data.toString() })
  const exited = new Promise<void>(resolve => child.on("close", () => resolve()))

  const startTime = Date.now()
  let conditionMet = false
  try {
    while (Date.now() - startTime < timeoutMs && child.exitCode === null) {
      if (await condition()) {
        conditionMet = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  } finally {
    stopProcessGroup(child.pid, "SIGTERM")
    // Cloud Run と同じく、SIGTERM から 10 秒で止まらなければ SIGKILL する（止まらないこと自体は stderr に残す）
    const killTimer = setTimeout(() => {
      stderr += "\n[daemon-runner] SIGTERM から 10 秒で終了しなかったので SIGKILL しました\n"
      stopProcessGroup(child.pid, "SIGKILL")
    }, 10000)
    await exited
    clearTimeout(killTimer)
  }
  return { stdout, stderr, conditionMet }
}

function stopProcessGroup(pid: number | undefined, signal: NodeJS.Signals) {
  if (pid == null) {
    return
  }
  try {
    process.kill(-pid, signal)
  } catch {
    // すでに終了している
  }
}
