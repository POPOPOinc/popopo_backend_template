import { FirestoreAccess } from "../../../access/firestore-access"
import { TaskDocument, TaskKind } from "schema"
import { logger, sleepMs } from "lib-server"

export type TaskConsumerOptions<Kind extends TaskKind> = {
  firestoreAccess: FirestoreAccess
  kinds: Kind | [Kind, ...Kind[]],
  process: (task: TaskDocument<Kind>) => Promise<TaskProcessResult>,
  retryPolicy?: RetryPolicy,
  /**
   * タスク処理中のロック保持期間（ミリ秒）。
   * この期間中は他のプロセスが同じタスクを処理しない。
   * デフォルト: 5分
   */
  lockDurationMs?: number,
  /**
   * true の場合、fatal 時にタスクドキュメントを削除する（デフォルト: false）。
   * 通常 fatal ではドキュメントが visible_start_at=null で残留するが、
   * コントローラ側でエラー処理が完結しておりドキュメントを残す必要がないタスクに使用する。
   */
  deleteOnFatal?: boolean
}

/**
 * Task の処理をする便利クラス
 * 実行に失敗したら失敗カウントを上げて一定時間後にリトライする、などをサポートする。
 * 複数プロセスで実行しても問題ないよう、タスク処理前にロックを取得する。
 */
export class TaskConsumer<Kind extends TaskKind> {

  private readonly firestoreAccess: FirestoreAccess
  private readonly kinds: [Kind, ...Kind[]]
  private readonly process: (task: TaskDocument<Kind>) => Promise<TaskProcessResult>
  private readonly retryPolicy: RetryPolicy
  private readonly lockDurationMs: number
  private readonly deleteOnFatal: boolean
  private readonly stats = {
    /**
     * firebase に問い合わせた回数 (waitTask を呼んだ数)
     */
    call: 0,
    /**
     * 処理成功数
     */
    ok: 0,
    /**
     * 処理失敗(リトライ発火)数
     */
    retry: 0,
    /**
     * 処理失敗(リトライ不能)数
     */
    fatal: 0
  }

  constructor(options: TaskConsumerOptions<Kind>) {
    this.firestoreAccess = options.firestoreAccess
    this.kinds = Array.isArray(options.kinds) ? options.kinds : [options.kinds]
    this.process = options.process
    this.retryPolicy = options.retryPolicy ?? {
      maxRetryCount: 10,
      alertAfterRetryCount: 5
    }
    this.lockDurationMs = options.lockDurationMs ?? 5 * 60 * 1000
    this.deleteOnFatal = options.deleteOnFatal ?? false
  }

  async run(ops: {
    abortSignal: AbortSignal
  }): Promise<void> {
    logger.info("TaskConsumerデーモンを開始します", {
      kinds: this.kinds
    })

    while (!ops.abortSignal.aborted) {
      this.stats.call++

      logger.info("TaskConsumerループイテレーションを開始しました", {
        kinds: this.kinds,
        stats: this.getStats()
      })

      const tasks = await this.firestoreAccess.task.waitTask({
        abortSignal: ops.abortSignal,
        kinds: this.kinds
      })

      // 複数Podが同じクエリ結果を取得するため、処理順をランダム化して
      // ロック競合を軽減する（Fisher-Yatesシャッフル）
      for (let i = tasks.length - 1; 0 < i; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[tasks[i], tasks[j]] = [tasks[j], tasks[i]]
      }

      for (const fetchedTask of tasks) {
        // 一度に最大 1000 件来るので、SIGTERM のあとは残りを処理しない（Cloud Run は 10 秒後に SIGKILL する）
        if (ops.abortSignal.aborted) {
          break
        }
        // ロック獲得を試みる（複数プロセス対応）
        const lockResult = await this.firestoreAccess.task.tryAcquireLockAndGetLatest({
          taskId: fetchedTask.id,
          lockDurationMs: this.lockDurationMs,
        })

        if (!lockResult.success) {
          logger.info("タスクロックの取得に失敗しました。スキップします（別のプロセスが処理中）", {
            id: fetchedTask.id,
            kind: fetchedTask.kind,
          })
          continue
        }

        // ロック獲得成功時は最新のタスク情報を使用
        const task = lockResult.task as TaskDocument<Kind>

        let res: TaskProcessResult
        let processError: unknown = undefined
        try {
          res = await this.process(task)
        } catch (error) {
          processError = error
          const alertThreshold = this.retryPolicy.alertAfterRetryCount
          const shouldAlert = alertThreshold <= task.task_failure_count
          if (shouldAlert) {
            logger.error("このタスクを処理できません", error, undefined, {
              id: task.id,
              kind: task.kind,
              failureCount: task.task_failure_count,
              alertThreshold,
            })
          } else {
            logger.warn("タスク処理に失敗しました。リトライします", {
              id: task.id,
              kind: task.kind,
              failureCount: task.task_failure_count,
              alertThreshold,
              error,
            })
          }
          res = { kind: "retry" }
        }

        if (this.retryPolicy.maxRetryCount <= task.task_failure_count) {
          res = res.kind === "ok" ? res : { kind: "fatal", errorMessage: res.kind === "fatal" ? res.errorMessage : formatProcessError(processError) }
        }

        let nextTryAt: Date | null = null
        await this.firestoreAccess.runTransaction(async tx => {
          const now = new Date()
          if (res.kind === "ok") {
            this.firestoreAccess.task.deleteTask(tx, task.id)
          } else if (res.kind === "fatal" || this.retryPolicy.maxRetryCount <= task.task_failure_count) {
            if (this.deleteOnFatal) {
              this.firestoreAccess.task.deleteTask(tx, task.id)
            } else {
              this.firestoreAccess.task.markTaskFailed(tx, {
                taskId: task.id,
                nextTryAt: null,
                now,
              })
            }
          } else {
            nextTryAt = new Date(Date.now() + calculateRetryInterval(this.retryPolicy.retryIntervalMsStrategy, task.task_failure_count))
            this.firestoreAccess.task.markTaskFailed(tx, {
              taskId: task.id,
              nextTryAt,
              now,
            })
          }
        })

        if (res.kind === "ok") {
          this.stats.ok++
        } else if (res.kind === "retry") {
          logger.warn("このタスクをリトライします", { task, nextTryAt })
          this.stats.retry++
        } else {
          logger.error("このタスクをリトライできません", { task })
          this.stats.fatal++
        }
      }

      logger.info("TaskConsumerループイテレーションを完了しました", {
        kinds: this.kinds,
        taskCount: tasks.length,
        stats: this.getStats()
      })

      await sleepMs(100)
    }

    logger.info("TaskConsumerデーモンが停止しました", {
      kinds: this.kinds,
      stats: this.getStats()
    })
  }

  getStats(): typeof this.stats {
    return {
      ...this.stats
    }
  }
}

function formatProcessError(error: unknown): string {
  if (error == null) {
    return "タスクの実行に失敗しました"
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * TaskConsumer の process コールバックが返す結果。
 *
 * - `ok`: 処理成功。タスクドキュメントは削除される。
 * - `retry`: 処理失敗。リトライ上限未達成の間は再試行される。
 * - `fatal`: 処理不能。リトライは行われず、visible_start_at=null で残る。
 */
export type TaskProcessResult =
  | { kind: "ok", output?: unknown }
  | { kind: "retry" }
  | { kind: "fatal", errorMessage?: string }

export const TaskProcessResult = {
  Ok: { kind: "ok" } satisfies TaskProcessResult,
  Retry: { kind: "retry" } satisfies TaskProcessResult,
  Fatal: { kind: "fatal" } satisfies TaskProcessResult,
} as const

export type RetryPolicy = {
  maxRetryCount: number,
  /**
   * exponential-backoff: 指数バックオフ (既定値)
   * number: 固定値
   */
  retryIntervalMsStrategy?: number | "exponential-backoff",
  /**
   * この回数以上失敗した場合にアラート（logger.error）を発生させる。
   * それ未満の場合は logger.warn で記録する。
   */
  alertAfterRetryCount: number
}

function calculateRetryInterval(policy: RetryPolicy["retryIntervalMsStrategy"], previousFailureCount: number): number {
  if (policy === "exponential-backoff" || policy == null) {
    return 2 ** previousFailureCount * 1000 + Math.ceil(Math.random() * 1000)
  } else {
    return policy
  }
}
