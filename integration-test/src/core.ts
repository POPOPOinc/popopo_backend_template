import { readFileSync } from "fs"
import { z } from "zod/v4"

const TestConfig = z.object({
  baseUrl: z.string(),
  firebase: z.object({
    projectId: z.string(),
    apiKey: z.string(),
    storageBucket: z.string(),
  }),
  ops: z.object({
    tenantId: z.string(),
  }),
})

const projectDir = `${__dirname}/..`

export const config = TestConfig.parse(JSON.parse(readFileSync(
  process.env.CONFIG_FILE ?? `${projectDir}/conf/emulator.json`,
  "utf-8",
)))

export type Env = "local" | "beta" | "dev" | "stage" | "prod"

/** projectId から環境を判定する。実プロジェクト ID は環境変数で上書きできる */
const environmentMap: { projectId: string, env: Env }[] = [
  { projectId: "demo-template", env: "local" },
  { projectId: process.env.PROJECT_ID_BETA ?? "your-project-beta", env: "beta" },
  { projectId: process.env.PROJECT_ID_DEV ?? "your-project-dev", env: "dev" },
  { projectId: process.env.PROJECT_ID_STAGE ?? "your-project-stage", env: "stage" },
  { projectId: process.env.PROJECT_ID_PROD ?? "your-project-prod", env: "prod" },
]

const getEnv = (projectId: string): Env => {
  const value = environmentMap.find(x => x.projectId === projectId)
  if (value === undefined) {
    throw new Error(`unknown environment! projectId: ${projectId}`)
  }
  return value.env
}

const isMoreStable = (actualEnv: Env, expectEnv: Env): boolean => {
  const actual = environmentMap.findIndex(x => x.env === actualEnv)
  const expect = environmentMap.findIndex(x => x.env === expectEnv)
  if (actual === -1 || expect === -1) {
    throw new Error(`unknown environment! actualEnv: ${actualEnv}, expectEnv: ${expectEnv}`)
  }
  return expect < actual
}

export const isEmulator = (): boolean => {
  return (
    !!process.env.FIRESTORE_EMULATOR_HOST ||
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
}

type ProvidesCallback = () => PromiseLike<unknown>

export const logger = {
  info: (...args: unknown[]): void => {
    process.stderr.write(`${args.map(String).join(" ")}\n`)
  },
  warn: (...args: unknown[]): void => {
    process.stderr.write(`  ⚠️ ${args.map(String).join(" ")}\n`)
  },
}

/**
 * 指定した環境よりも安定環境だったら実行しない。
 * - "beta" -> local, beta
 * - "prod" -> 全環境 (testAlways と同じ)
 */
export const testWithEnvironment = (testName: string, expectEnv: Env, fn: ProvidesCallback, timeout?: number) => {
  if (isMoreStable(getEnv(config.firebase.projectId), expectEnv)) {
    logger.warn(`[testWithEnvironment] test skipped. target env: ${expectEnv}`)
    test.skip(testName, fn, timeout)
    return
  }
  test(testName, fn, timeout)
}

export const testAlways = (testName: string, fn: ProvidesCallback, timeout?: number) => {
  testWithEnvironment(testName, "prod", fn, timeout)
}

/** エミュレータ環境でのみ実行するテスト */
export const testOnlyEmulator = (testName: string, reason: string, fn: ProvidesCallback, timeout?: number) => {
  if (!isEmulator()) {
    logger.warn(`[testOnlyEmulator] test skipped. reason: ${reason}`)
    test.skip(testName, fn, timeout)
    return
  }
  test(testName, fn, timeout)
}

/** テスト中で値の存在を保証する（non-null assertion の代わり） */
export function required<T>(value: T | null | undefined, message = "value is required"): T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
  return value
}
