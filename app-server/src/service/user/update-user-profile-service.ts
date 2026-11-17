import { Transaction } from "firebase-admin/firestore"
import { TaskKind, UserId } from "schema"
import type { FirestoreAccess } from "../../access/firestore-access"

/**
 * ユーザーのプロフィール更新。アプリからの更新と管理者による更新の両方で使う。
 * 更新した内容は syncUserToAlgolia タスク経由で Algolia に反映される。
 */
export class UpdateUserProfileService {

  constructor(
    private readonly firestore: FirestoreAccess,
  ) {
  }

  updateDisplayName(tx: Transaction, userId: UserId, displayName: string, now: number): void {
    this.firestore.user.updateDisplayName(tx, userId, displayName, now)
    this.firestore.task.createTask(tx, { kind: TaskKind.syncUserToAlgolia, value: userId }, new Date(now))
  }

}
