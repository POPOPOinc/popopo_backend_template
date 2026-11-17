import { Firestore, Transaction } from "firebase-admin/firestore"
import { FirestorePaths, UserDocument, UserDocuments, UserId, UserStatus } from "schema"
import { nonNullable } from "lib-common"
import { FirestoreUtil } from "../lib/firestore-utils"
import { walkCollection, WalkRequest, WalkResponse } from "../lib/walk"

export class UserAccess {

  constructor(
    public readonly firestore: Firestore,
  ) {
  }

  private getUsersCollection() {
    return this.firestore.collection(FirestorePaths.Users.path)
  }

  private getUserDocument(userId: UserId) {
    return this.firestore.doc(FirestorePaths.Users.getDocPath(userId))
  }

  async getUserById(tx: Transaction | null, id: UserId): Promise<UserDocument | null> {
    const snapshot = await FirestoreUtil.get(tx, this.getUserDocument(id))
    return UserDocuments.fromDocumentSnapshot(snapshot)
  }

  async getUsersByIds(ids: UserId[]): Promise<UserDocument[]> {
    if (ids.length === 0) {
      return []
    }
    const snapshots = await this.firestore.getAll(...ids.map(id => this.getUserDocument(id)))
    return snapshots.map(doc => UserDocuments.fromDocumentSnapshot(doc)).filter(nonNullable)
  }

  async walkUsers(tx: Transaction | null, request: WalkRequest<string>): Promise<WalkResponse<UserDocument, string>> {
    return walkCollection(tx, this.getUsersCollection(), request, doc => UserDocuments.fromDocumentSnapshot(doc))
  }

  /** 会員登録。既に存在する場合はトランザクションが失敗する */
  createUser(tx: Transaction, user: UserDocument): void {
    tx.create(this.getUserDocument(user.id), UserDocuments.toDocumentData(user))
  }

  updateDisplayName(tx: Transaction, userId: UserId, displayName: string, now: number): void {
    tx.update(this.getUserDocument(userId), {
      display_name: displayName,
      updated_at: now,
    })
  }

  updateStatus(tx: Transaction, userId: UserId, status: UserStatus, now: number): void {
    tx.update(this.getUserDocument(userId), {
      status,
      updated_at: now,
    })
  }

}
