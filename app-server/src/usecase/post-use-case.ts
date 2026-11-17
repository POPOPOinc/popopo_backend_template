import { Transaction } from "firebase-admin/firestore"
import { AlgoliaAccessLike } from "lib-server/algolia-access"
import { AdminOperationKind, AdminOperationTargetKind, calculatePeriodState, Period, PostDocument, PostId, TaskKind, UserDocument, UserDocuments } from "schema"
import type { CreatePostRequest } from "schema/api/app/types"
import type { ManageUpdatePostRequest } from "schema/api/manage/types"
import { FirebaseStorageAccess } from "../access/firebase-storage-access"
import { FirestoreAccess } from "../access/firestore-access"
import type { ManageRequestContext } from "../interfaces/request-context"
import { ErrorResponse, IDResponseValue, OKResponseValue, Responses, SuccessOKResponse } from "../interfaces/response"

export class PostUseCase {

  constructor(
    private readonly firestoreAccess: FirestoreAccess,
    private readonly algoliaAccess: AlgoliaAccessLike,
    private readonly storageAccess: FirebaseStorageAccess,
  ) {
  }

  async createPost(user: UserDocument, request: CreatePostRequest, now: number = Date.now()): Promise<SuccessOKResponse<IDResponseValue<PostId>> | ErrorResponse> {
    const displayPeriod: Period = request.display_period ?? { start_at: now, end_at: null }
    if (displayPeriod.end_at !== null && displayPeriod.end_at < displayPeriod.start_at) {
      return Responses.errorBadRequest("終了日時は開始日時より後に設定してください")
    }
    const post: PostDocument = {
      id: this.firestoreAccess.post.newPostId(),
      user_id: user.id,
      author: UserDocuments.toDenormalized(user),
      body: request.body,
      display_period: displayPeriod,
      display_period_state: calculatePeriodState(displayPeriod, now),
      created_at: now,
      updated_at: now,
    }
    await this.firestoreAccess.runTransaction(async tx => {
      this.firestoreAccess.post.createPost(tx, post)
      this.createSyncPostToAlgoliaTask(tx, post.id, new Date(now))
    })
    return Responses.successOK({ id: post.id })
  }

  /** 表示期間の状態を更新する（daemon updatePostDisplayPeriod から呼ぶ） */
  async updateDisplayPeriodStatus(post: PostDocument): Promise<void> {
    const now = new Date()
    await this.firestoreAccess.runTransaction(async tx => {
      const current = await this.firestoreAccess.post.getPostById(tx, post.id)
      if (!current) {
        return
      }
      this.firestoreAccess.post.updateDisplayPeriodStatus(tx, current, now)
      this.createSyncPostToAlgoliaTask(tx, current.id, now)
    })
  }

  /** 管理者による表示期間の変更 */
  async updatePost(args: ManageRequestContext, postId: PostId, request: ManageUpdatePostRequest, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    const displayPeriod: Period = request.display_period
    if (displayPeriod.end_at !== null && displayPeriod.end_at < displayPeriod.start_at) {
      return Responses.errorBadRequest("終了日時は開始日時より後に設定してください")
    }
    const displayPeriodState = calculatePeriodState(displayPeriod, now)
    const result = await this.firestoreAccess.runTransaction(async tx => {
      const post = await this.firestoreAccess.post.getPostById(tx, postId)
      if (!post) {
        return null
      }
      this.firestoreAccess.post.updateDisplayPeriod(tx, postId, displayPeriod, displayPeriodState, now)
      this.firestoreAccess.adminOperation.createAdminOperation(tx, {
        kind: AdminOperationKind.updatePost,
        value: { post_id: postId, display_period: displayPeriod },
        target: { kind: AdminOperationTargetKind.post, value: { id: postId } },
        admin_user: { id: args.admin.id, email: args.admin.email },
        created_at: now,
      })
      this.createSyncPostToAlgoliaTask(tx, postId, new Date(now))
      return post
    })
    if (!result) {
      return Responses.errorNotFound("投稿が見つかりません。")
    }
    return Responses.successOK(OKResponseValue)
  }

  /**
   * daemon（consume-sync-post-to-algolia-task）から呼ばれ、Firestore の最新状態を Algolia に反映する。
   * 表示期間内の投稿だけを検索できるようにする
   */
  async syncPostToAlgolia(postId: PostId): Promise<void> {
    const post = await this.firestoreAccess.post.getPostById(null, postId)
    if (post?.display_period_state.active) {
      await this.algoliaAccess.savePosts([post])
    } else {
      await this.algoliaAccess.deletePosts([postId])
    }
  }

  /** Firestore の書き込みと同じ transaction で積み、Algolia への反映が失敗しても daemon が再試行できるようにする */
  private createSyncPostToAlgoliaTask(tx: Transaction, postId: PostId, now: Date): void {
    this.firestoreAccess.task.createTask(tx, { kind: TaskKind.syncPostToAlgolia, value: postId }, now)
  }

  async deleteOwnPost(user: UserDocument, postId: PostId): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    const result = await this.firestoreAccess.runTransaction(async tx => {
      const post = await this.firestoreAccess.post.getPostById(tx, postId)
      if (!post) {
        return Responses.errorNotFound("投稿が見つかりません。")
      }
      if (post.user_id !== user.id) {
        return Responses.errorForbidden("他のユーザーの投稿は削除できません。")
      }
      this.firestoreAccess.post.deletePost(tx, postId)
      this.createSyncPostToAlgoliaTask(tx, postId, new Date())
      return Responses.successOK(OKResponseValue)
    })
    if (result.status === 200) {
      await this.storageAccess.deletePostMedia(postId)
    }
    return result
  }

  /** 管理者による削除（投稿者のチェックをしない） */
  async deletePost(args: ManageRequestContext, postId: PostId, now: number = Date.now()): Promise<SuccessOKResponse<OKResponseValue> | ErrorResponse> {
    const result = await this.firestoreAccess.runTransaction(async tx => {
      const post = await this.firestoreAccess.post.getPostById(tx, postId)
      if (!post) {
        return Responses.errorNotFound("投稿が見つかりません。")
      }
      this.firestoreAccess.post.deletePost(tx, postId)
      this.firestoreAccess.adminOperation.createAdminOperation(tx, {
        kind: AdminOperationKind.deletePost,
        value: { post_id: postId },
        target: { kind: AdminOperationTargetKind.post, value: { id: postId } },
        admin_user: { id: args.admin.id, email: args.admin.email },
        created_at: now,
      })
      this.createSyncPostToAlgoliaTask(tx, postId, new Date(now))
      return Responses.successOK(OKResponseValue)
    })
    if (result.status === 200) {
      await this.storageAccess.deletePostMedia(postId)
    }
    return result
  }

}
