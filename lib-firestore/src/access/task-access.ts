import { Firestore, Transaction } from "firebase-admin/firestore"
import { FieldValue } from "firebase-admin/firestore"
import { FirestorePaths, TaskDocument, TaskDocumentMeta, TaskDocuments, TaskId, TaskKind } from "schema"
import { waitOpenFor } from "../lib/wait-for"

/**
 * `tasks` コレクションを分散タスクキューとして扱う。
 * visible_start_at を過ぎたタスクだけが処理対象になり、処理中はロックとして未来時刻を入れる。
 */
export class TaskAccess {
  constructor(
    public readonly firestore: Firestore
  ) {
  }

  private getTasksCollection() {
    return this.firestore.collection(FirestorePaths.Tasks.path)
  }

  private getTaskDocument(taskId: TaskId) {
    return this.getTasksCollection().doc(taskId)
  }

  async waitTask<Kind extends TaskKind>(
    options: {
      abortSignal: AbortSignal
      kinds: Kind | [Kind, ...Kind[]]
    }
  ): Promise<TaskDocument<Kind>[]> {
    const kinds = Array.isArray(options.kinds) ? options.kinds : [options.kinds]
    const snapshot =
      await waitOpenFor(
        options.abortSignal,
        this.getTasksCollection().where("kind", "in", kinds),
        "visible_start_at"
      )
    const results = snapshot.docs.map(TaskDocuments.fromDocumentSnapshot).filter(x => x !== null)
    // TaskDocument[] であることは型導出上明らかだが(もし違うならコンパイルエラーになってほしい)、TaskDocument<Kind>[] 型であることは型では判断できないので、as で明示的に指定する
    return results satisfies TaskDocument[] as TaskDocument<Kind>[]
  }

  createTask(
    tx: Transaction,
    value: TaskDocumentMeta,
    now: Date,
    options: { visibleStartAt?: number } = {}
  ): TaskDocument {
    const doc = this.getTasksCollection().doc()
    const body = TaskDocuments.toNewDocumentData(value, now, options)
    const task: TaskDocument = { ...body, id: TaskId(doc.id) }
    tx.create(doc, TaskDocuments.toDocumentData(task))
    return task
  }

  deleteTask(tx: Transaction, id: TaskId): TaskId {
    tx.delete(this.getTaskDocument(id))
    return id
  }

  markTaskFailed(
    tx: Transaction,
    { taskId, nextTryAt, now }: {
      taskId: TaskId,
      nextTryAt: Date | null,
      now: Date
    }
  ): void {
    tx.update(this.getTaskDocument(taskId), {
      task_failure_count: FieldValue.increment(1),
      visible_start_at: nextTryAt == null ? null : nextTryAt.getTime(),
      updated_at: now.getTime()
    })
  }

  markTaskProcessingStarted(
    tx: Transaction,
    taskId: TaskId,
    lockDurationMs: number
  ): void {
    const now = Date.now()
    tx.update(this.getTaskDocument(taskId), {
      visible_start_at: now + lockDurationMs,
      updated_at: now,
    })
  }

  async getTask(
    tx: Transaction,
    taskId: TaskId
  ): Promise<TaskDocument | null> {
    const snapshot = await tx.get(this.getTaskDocument(taskId))
    return TaskDocuments.fromDocumentSnapshot(snapshot)
  }

  async tryAcquireLockAndGetLatest(params: {
    taskId: TaskId
    lockDurationMs?: number
  }): Promise<{ success: true; task: TaskDocument } | { success: false }> {
    const { taskId, lockDurationMs = 5 * 60 * 1000 } = params

    return await this.firestore.runTransaction(async tx => {
      const latestTask = await this.getTask(tx, taskId)

      if (!latestTask) {
        return { success: false }
      }

      const now = Date.now()
      // visible_start_atが未来の場合は他のプロセスが処理中
      if (latestTask.visible_start_at !== null && now < latestTask.visible_start_at) {
        return { success: false }
      }

      // 処理中としてロックを取得
      this.markTaskProcessingStarted(tx, taskId, lockDurationMs)

      return { success: true, task: latestTask }
    })
  }
}
