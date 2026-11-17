import { logger } from "lib-server"
import { sleepMs } from "lib-server"

/**
 * アイテムごとの失敗状態
 */
type ItemFailureState = {
  failureCount: number
  nextRetryAt: number
}

/**
 * バックオフポリシー
 */
export type BackoffPolicy = {
  /**
   * 最大リトライ回数
   * この回数を超えたらアイテムをスキップする
   * デフォルト: 10
   */
  maxRetryCount: number
  /**
   * アラートを発生させるリトライ回数の閾値
   * この回数以上失敗した場合に logger.error を使用する
   * それ未満の場合は logger.warn を使用する
   * デフォルト: 5
   */
  alertAfterRetryCount: number
}

const DEFAULT_BACKOFF_POLICY: BackoffPolicy = {
  maxRetryCount: 10,
  alertAfterRetryCount: 5
}

/**
 * 個別アイテム処理のタイムアウト（ミリ秒）
 * デフォルト: 30秒
 */
const DEFAULT_PROCESS_TIMEOUT_MS = 30000

/**
 * タイムアウト付きで Promise を実行する
 */
async function withTimeout<R>(
  promise: Promise<R>,
  timeoutMs: number,
  errorMessage: string
): Promise<R> {
  let timeoutId: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * 指数バックオフでリトライ間隔を計算する
 * TaskConsumer と同じロジック
 */
function calculateRetryInterval(failureCount: number): number {
  return 2 ** failureCount * 1000 + Math.ceil(Math.random() * 1000)
}

/**
 * 「待機 → 処理」パターンの daemon 用ヘルパークラス
 * 
 * TaskConsumer と同様のパターンで、非 Task 系 daemon のループ処理を共通化する。
 * ループの各イテレーションでログを出力し、処理状況の監視を容易にする。
 * 
 * アイテムは `id` プロパティを持つ必要がある（Firestore ドキュメントを想定）。
 * アイテム単位でバックオフを管理し、特定のアイテムで連続してエラーが発生しても
 * 他のアイテムの処理に影響を与えない。
 * 
 * 使用例:
 * ```typescript
 * const runner = new WaitAndProcessRunner({
 *   name: "aggregateLiveReactions",
 *   wait: (abortSignal) => Core.firestoreAccess.live.waitLiveScheduledForAggregatingReactions(abortSignal),
 *   process: async (live) => {
 *     await processLiveReactions(live)
 *   },
 * })
 * await runner.run({ abortSignal: ctx.abortSignal })
 * ```
 */
export type WaitAndProcessRunnerOptions<T extends { id: string }> = {
  /**
   * daemon の名前（ログ出力に使用）
   */
  name: string
  /**
   * アイテムを待機して取得する関数
   * abortSignal が abort されたら空配列を返すか、例外をスローすること
   */
  wait: (abortSignal: AbortSignal) => Promise<T[]>
  /**
   * 各アイテムを処理する関数
   * 例外をスローした場合はログに記録され、次のアイテムの処理に進む
   */
  process: (item: T) => Promise<void>
  /**
   * ループ後のスリープ時間（ミリ秒）
   * デフォルト: 100ms
   */
  sleepAfterLoopMs?: number
  /**
   * バックオフポリシー
   */
  backoffPolicy?: Partial<BackoffPolicy>
  /**
   * 個別アイテム処理のタイムアウト（ミリ秒）
   * デフォルト: 30秒
   */
  processTimeoutMs?: number
}

export class WaitAndProcessRunner<T extends { id: string }> {
  private readonly name: string
  private readonly wait: (abortSignal: AbortSignal) => Promise<T[]>
  private readonly process: (item: T) => Promise<void>
  private readonly sleepAfterLoopMs: number
  private readonly backoffPolicy: BackoffPolicy
  private readonly processTimeoutMs: number
  /**
   * アイテムごとの失敗状態（メモリ上で管理）
   * daemon 再起動時にはリセットされる
   */
  private readonly itemFailureStates = new Map<string, ItemFailureState>()
  private readonly stats = {
    /**
     * wait を呼んだ回数
     */
    call: 0,
    /**
     * 処理したアイテム数
     */
    processed: 0,
    /**
     * 処理失敗数（リトライ予定）
     */
    retry: 0,
    /**
     * 処理失敗数（リトライ不能、スキップ）
     */
    skipped: 0
  }

  constructor(options: WaitAndProcessRunnerOptions<T>) {
    this.name = options.name
    this.wait = options.wait
    this.process = options.process
    this.sleepAfterLoopMs = options.sleepAfterLoopMs ?? 100
    this.backoffPolicy = {
      ...DEFAULT_BACKOFF_POLICY,
      ...options.backoffPolicy
    }
    this.processTimeoutMs = options.processTimeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS
  }

  async run(ops: {
    abortSignal: AbortSignal
  }): Promise<void> {
    logger.info("WaitAndProcessRunnerデーモンを開始します", {
      name: this.name
    })

    while (!ops.abortSignal.aborted) {
      // ループ内でエラーが発生したかどうかを追跡（ループ単位でのアラート用）
      let loopHadError = false

      try {
        this.stats.call++

        // ループ開始時のログ
        logger.info("WaitAndProcessRunnerループイテレーションを開始しました", {
          name: this.name,
          stats: this.getStats()
        })

        const items = await this.wait(ops.abortSignal)

        if (0 < items.length) {
          logger.info("WaitAndProcessRunner処理対象のアイテムが見つかりました", {
            name: this.name,
            count: items.length,
            stats: this.getStats()
          })
        } else {
          // アイテムがなかった場合のログ
          logger.info("WaitAndProcessRunner処理対象のアイテムがありません", {
            name: this.name,
            stats: this.getStats()
          })
        }

        for (const item of items) {
          // 一度に最大 1000 件来るので、SIGTERM のあとは残りを処理しない（Cloud Run は 10 秒後に SIGKILL する）
          if (ops.abortSignal.aborted) {
            break
          }
          // バックオフ中のアイテムはスキップ
          const failureState = this.itemFailureStates.get(item.id)
          if (failureState) {
            const now = Date.now()
            if (now < failureState.nextRetryAt) {
              // まだリトライ時刻になっていない
              continue
            }
            // 最大リトライ回数を超えている場合はスキップ
            if (this.backoffPolicy.maxRetryCount <= failureState.failureCount) {
              continue
            }
          }

          try {
            // タイムアウト付きで処理を実行
            await withTimeout(
              this.process(item),
              this.processTimeoutMs,
              `Process timeout after ${this.processTimeoutMs}ms for item ${item.id}`
            )
            this.stats.processed++
            // 成功したら失敗状態をクリア
            this.itemFailureStates.delete(item.id)
          } catch (error) {
            loopHadError = true
            const currentFailureCount = (failureState?.failureCount ?? 0) + 1
            const shouldAlert = this.backoffPolicy.alertAfterRetryCount <= currentFailureCount

            if (this.backoffPolicy.maxRetryCount <= currentFailureCount) {
              // 最大リトライ回数を超えた
              this.stats.skipped++
              this.itemFailureStates.set(item.id, {
                failureCount: currentFailureCount,
                nextRetryAt: Infinity // 永久にスキップ
              })
              logger.error("WaitAndProcessRunner最大リトライ回数を超えました。アイテムをスキップします", error, undefined, {
                name: this.name,
                itemId: item.id,
                failureCount: currentFailureCount,
                maxRetryCount: this.backoffPolicy.maxRetryCount,
                stats: this.getStats()
              })
            } else {
              // リトライ予定
              this.stats.retry++
              const retryInterval = calculateRetryInterval(currentFailureCount)
              this.itemFailureStates.set(item.id, {
                failureCount: currentFailureCount,
                nextRetryAt: Date.now() + retryInterval
              })
              if (shouldAlert) {
                logger.error("WaitAndProcessRunnerアイテム処理に失敗しました", error, undefined, {
                  name: this.name,
                  itemId: item.id,
                  failureCount: currentFailureCount,
                  alertThreshold: this.backoffPolicy.alertAfterRetryCount,
                  nextRetryInMs: retryInterval,
                  stats: this.getStats()
                })
              } else {
                logger.warn("WaitAndProcessRunnerのアイテム処理に失敗しました。リトライします", {
                  name: this.name,
                  itemId: item.id,
                  failureCount: currentFailureCount,
                  alertThreshold: this.backoffPolicy.alertAfterRetryCount,
                  nextRetryInMs: retryInterval,
                  error
                })
              }
            }
          }
        }

        // ループ単位でのエラーアラート（1ループにつき1回）
        if (loopHadError) {
          logger.error("WaitAndProcessRunnerループがエラーで完了しました", null, undefined, {
            name: this.name,
            stats: this.getStats()
          })
        }
      } catch (error) {
        if (ops.abortSignal.aborted) {
          break
        }
        logger.error("WaitAndProcessRunnerデーモンループでエラーが発生しました", error, undefined, {
          name: this.name,
          stats: this.getStats()
        })
      }

      await sleepMs(this.sleepAfterLoopMs)
    }

    logger.info("WaitAndProcessRunnerデーモンが停止しました", {
      name: this.name,
      stats: this.getStats()
    })
  }

  /**
   * 現在の統計情報を取得
   */
  getStats(): typeof this.stats {
    return {
      ...this.stats
    }
  }
}
