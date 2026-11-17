import { Query } from "firebase-admin/firestore"
import type { QuerySnapshotLike } from "../index"


export async function waitFor<E>(signal: AbortSignal, src: Query<E>, options: { limit?: number } = {}): Promise<QuerySnapshotLike<E>> {
  if (signal.aborted) {
    throw signal.reason
  }
  const { promise, resolve, reject } = Promise.withResolvers<QuerySnapshotLike<E>>()

  function cancel() {
    reject(signal.reason)
  }

  signal.addEventListener("abort", cancel, { once: true })
  const unsubscribe = src.limit(options.limit ?? 100).onSnapshot(snapshot => {
    if (!snapshot.empty) {
      resolve({ docs: snapshot.docs })
    }
  }, reject)
  try {
    return await promise
  } finally {
    try {
      unsubscribe()
    } catch {
      // no-op
    }
    signal.removeEventListener("abort", cancel)
  }
}

/**
 * 指定されたフィールドの時刻が現在時刻を過ぎるまで待機する
 * waitFor と同一だが、時刻ベースの条件で待機する
 *
 * 呼び出し時点で対象となるドキュメントが複数存在する場合は、options.limit で指定した件数分
 * 返すが、ない場合は、現在時刻を過ぎたドキュメントが1件現れるまで待機する。
 *
 * 注意: 待機時間が 32bit signed int の上限（約24.8日）を超える場合、setTimeout をスキップします。
 * この場合、daemon の再起動時に再度チェックされることを想定しています。
 *
 * @example
 * // scheduled_at が 2024-01-01 10:00:00 のタスクを待つ場合
 * // 現在が 2024-01-01 09:30:00 なら 30分間待機してから解決
 * await waitOpenFor(signal, tasksQuery, "scheduled_at")
 *
 * @param signal AbortSignal
 * @param src クエリ対象
 * @param timeField 時間フィールド
 * @param options
 * @param options.elapsedMs 指定時間分古いドキュメントを待機（ミリ秒）
 *                         未指定の場合は現在時刻を過ぎたドキュメントを待機
 * @param options.limit 取得するドキュメントの上限数（デフォルト: 1000）
 */
export async function waitOpenFor<E>(
  signal: AbortSignal,
  src: Query<E>,
  timeField: string,
  options: { elapsedMs?: number; limit?: number } = {}
): Promise<QuerySnapshotLike<E>> {
  // waitFor と実装をまとめてもいいかも…
  // (いい共通化が思いつかなかったのでやめた)

  if (signal.aborted) {
    throw signal.reason
  }
  const { promise, resolve, reject } = Promise.withResolvers<QuerySnapshotLike<E>>()

  function cancel() {
    reject(signal.reason)
  }

  // 現在時刻を過ぎているドキュメントがある場合は即座に返す
  const currentSnapshot = await src.where(timeField, "<", Date.now() - (options.elapsedMs ?? 0)).orderBy(timeField).limit(options.limit ?? 1000).get()
  if (!currentSnapshot.empty) {
    resolve({ docs: currentSnapshot.docs })
    return await promise
  }

  // get() を待っている間に abort されていると、このあと listen しても abort のイベントは来ないので、ここでも確かめる
  if (signal.aborted) {
    throw signal.reason
  }

  // それ以外の場合は wait するので abort を listen する
  signal.addEventListener("abort", cancel, { once: true })

  let waitTimeId: NodeJS.Timeout | null = null
  const MAX_TIMEOUT_MS = 2147483647 // 32bit signed int の上限

  const unsubscribe = src.where(timeField, "!=", null).orderBy(timeField).limit(1).onSnapshot(snapshot => {
    if (waitTimeId != null) {
      clearTimeout(waitTimeId)
      waitTimeId = null
    }
    if (!snapshot.empty) {
      const document = snapshot.docs[0]
      const time: number = document.get(timeField)
      const now = Date.now()
      const waitTime = time - now + (options.elapsedMs ?? 0)
      if (waitTime <= 0) {
        resolve({ docs: [document] })
      } else if (waitTime <= MAX_TIMEOUT_MS) {
        waitTimeId = setTimeout(() => {
          resolve({ docs: [document] })
        }, waitTime)
      }
    }
  }, reject)
  try {
    return await promise
  } finally {
    try {
      unsubscribe()
    } catch {
      // no-op
    }
    if (waitTimeId != null) {
      clearTimeout(waitTimeId)
    }
    signal.removeEventListener("abort", cancel)
  }
}
