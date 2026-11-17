import { Firestore, Query, Transaction } from "firebase-admin/firestore"
import { calculatePeriodState, FirestorePaths, Period, PeriodState, PostDocument, PostDocuments, PostId, UserId } from "schema"
import { nonNullable } from "lib-common"
import { FirestoreUtil } from "../lib/firestore-utils"
import { waitOpenFor } from "../lib/wait-for"

export type PostPage = {
  posts: PostDocument[]
  nextCursor: PostId | null
}

export class PostAccess {

  constructor(
    public readonly firestore: Firestore,
  ) {
  }

  private getPostsCollection() {
    return this.firestore.collection(FirestorePaths.Posts.path)
  }

  private getPostDocument(postId: PostId) {
    return this.firestore.doc(FirestorePaths.Posts.getDocPath(postId))
  }

  newPostId(): PostId {
    return PostId(this.getPostsCollection().doc().id)
  }

  async getPostById(tx: Transaction | null, id: PostId): Promise<PostDocument | null> {
    const snapshot = await FirestoreUtil.get(tx, this.getPostDocument(id))
    return PostDocuments.fromDocumentSnapshot(snapshot)
  }

  /** 新しい順に取得する。cursor には前ページ最後の投稿 ID を渡す */
  async listPosts(limit: number, cursor?: PostId): Promise<PostPage> {
    return this.paginate(this.getPostsCollection().orderBy("created_at", "desc"), limit, cursor)
  }

  /** 特定ユーザーの投稿を新しい順に取得する（firestore.indexes.json に複合インデックスが必要） */
  async listPostsByUser(userId: UserId, limit: number, cursor?: PostId): Promise<PostPage> {
    return this.paginate(this.getPostsCollection().where("user_id", "==", userId).orderBy("created_at", "desc"), limit, cursor)
  }

  createPost(tx: Transaction, post: PostDocument): void {
    tx.create(this.getPostDocument(post.id), PostDocuments.toDocumentData(post))
  }

  /** 表示期間を変更する（manage から） */
  updateDisplayPeriod(tx: Transaction, id: PostId, displayPeriod: Period, displayPeriodState: PeriodState, now: number): void {
    tx.update(this.getPostDocument(id), {
      display_period: displayPeriod,
      display_period_state: displayPeriodState,
      updated_at: now,
    })
  }

  /**
   * 次に表示期間の状態が変わる Post を待機する
   * display_period_state.next_change_at フィールドの時刻が現在時刻を過ぎるまで待機
   *
   * @param signal AbortSignal
   * @returns 状態変更時刻に達した PostDocument の配列
   */
  async waitPostDisplayPeriodChange(
    signal: AbortSignal
  ): Promise<PostDocument[]> {
    const query = this.getPostsCollection()

    const snapshot = await waitOpenFor(signal, query, "display_period_state.next_change_at")

    return snapshot.docs
      .map(doc => PostDocuments.fromDocumentSnapshot(doc))
      .filter(nonNullable)
  }

  /**
   * 指定された Post の display_period_state を更新
   */
  updateDisplayPeriodStatus(
    tx: Transaction,
    post: PostDocument,
    now: Date
  ): void {
    const nowTime = now.getTime()

    const newState = calculatePeriodState(
      post.display_period,
      nowTime
    )

    tx.update(this.getPostDocument(post.id), {
      display_period_state: newState,
      updated_at: nowTime
    })
  }

  deletePost(tx: Transaction, id: PostId): void {
    tx.delete(this.getPostDocument(id))
  }

  private async paginate(query: Query, limit: number, cursor?: PostId): Promise<PostPage> {
    let q = query.limit(limit + 1)
    if (cursor) {
      const cursorSnapshot = await this.getPostDocument(cursor).get()
      if (cursorSnapshot.exists) {
        q = q.startAfter(cursorSnapshot)
      }
    }
    const snapshot = await q.get()
    const posts = snapshot.docs.slice(0, limit).map(doc => PostDocuments.fromDocumentSnapshot(doc)).filter(nonNullable)
    const last = posts.at(-1)
    return {
      posts,
      nextCursor: limit < snapshot.docs.length && last ? last.id : null,
    }
  }

}
