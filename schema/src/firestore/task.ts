import { PostId, TaskId, UserId } from "../id"
import type { DocumentSnapshotLike } from "../firestore"

/**
 * daemon が処理する非同期タスクの種別。
 * `tasks` コレクションを分散タスクキューとして使い、kind-value パターンで格納する。
 */
export const TaskKind = {
  syncUserToAlgolia: "sync-user-to-algolia",
  deleteUser: "delete-user",
  syncPostToAlgolia: "sync-post-to-algolia",
} as const

export type TaskKind = typeof TaskKind[keyof typeof TaskKind]

export type SyncUserToAlgoliaTaskDocumentMeta = {
  kind: typeof TaskKind.syncUserToAlgolia,
  value: UserId,
}

export type DeleteUserTaskDocumentMeta = {
  kind: typeof TaskKind.deleteUser,
  value: UserId,
}

export type SyncPostToAlgoliaTaskDocumentMeta = {
  kind: typeof TaskKind.syncPostToAlgolia,
  value: PostId,
}

export type TaskDocumentMetaUnion =
  | SyncUserToAlgoliaTaskDocumentMeta
  | DeleteUserTaskDocumentMeta
  | SyncPostToAlgoliaTaskDocumentMeta

export type TaskDocumentMeta<T extends TaskKind = TaskKind> = Extract<TaskDocumentMetaUnion, { kind: T }>

export type TaskDocumentBody<T extends TaskKind = TaskKind> = TaskDocumentMeta<T> & {
  // いつ以降処理可能なタスクか(この時間より前は存在しないタスクと同等となる)。特に遅延が必要なければ現在時刻を入れれば良い。
  // null の場合は永久に実行されない。例えばリトライ上限を超えた場合などに使う。
  // (== null という条件でクエリを発行したいため、明示的に null をデータとして保存する必要がある)
  visible_start_at: number | null,
  // 何回実行に失敗したか
  task_failure_count: number,
  created_at: number,
  updated_at: number
}

export type TaskDocument<T extends TaskKind = TaskKind> = TaskDocumentBody<T> & {
  id: TaskId
}

export class TaskDocuments {

  static toNewDocumentData(
    value: TaskDocumentMeta,
    now: Date,
    options: { visibleStartAt?: number } = {}
  ): TaskDocumentBody {
    return {
      ...value,
      task_failure_count: 0,
      visible_start_at: options.visibleStartAt ?? now.getTime(),
      created_at: now.getTime(),
      updated_at: now.getTime(),
    }
  }

  static toDocumentData(task: TaskDocument): object {
    return {
      ...task,
      // id は document path に入るので入れない
      id: undefined,
    }
  }

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): TaskDocument | null {
    if (!doc) {
      return null
    }
    const data = doc.data()
    if (data === undefined) {
      return null
    }

    const baseObject = {
      id: TaskId(doc.id),
      // 互換性のため、フィールドがないものは null を保存しておく
      visible_start_at: data["visible_start_at"] == null ? null : data["visible_start_at"],
      task_failure_count: data["task_failure_count"],
      created_at: data["created_at"],
      updated_at: data["updated_at"],
    }

    const kind = data["kind"] as TaskKind
    switch (kind) {
      case TaskKind.syncUserToAlgolia:
        return { ...baseObject, kind, value: UserId(data["value"]) }
      case TaskKind.deleteUser:
        return { ...baseObject, kind, value: UserId(data["value"]) }
      case TaskKind.syncPostToAlgolia:
        return { ...baseObject, kind, value: PostId(data["value"]) }
      default:
        return kind satisfies never
    }
  }

}
