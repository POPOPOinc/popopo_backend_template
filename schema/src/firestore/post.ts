import { z } from "zod/v4"
import { PostId, PostIdSchema, UserIdSchema } from "../id"
import type { DocumentSnapshotLike } from "../firestore"
import { zPostBody } from "../api/app/zod.gen"
import { maxLengthOf, Period, PeriodState } from "./common"
import { CreatedAt, UpdatedAt } from "./system"
import { UserDenormalized } from "./user"

export class Posts {

  public static readonly BODY_MAX_LENGTH = maxLengthOf(zPostBody)

}

export const PostDocumentBody = z.object({
  user_id: UserIdSchema.describe("投稿者のユーザー ID（クエリ用）"),
  author: UserDenormalized.describe("投稿者の非正規化ユーザー情報"),
  body: z.string().min(1).max(Posts.BODY_MAX_LENGTH).describe("本文"),
  display_period: Period.describe("表示期間"),
  display_period_state: PeriodState.describe("表示期間の状態（システム自動計算、daemon updatePostDisplayPeriod が更新する）。active が false の投稿は投稿者と管理者だけが読める"),
  created_at: CreatedAt,
  updated_at: UpdatedAt,
})

export type PostDocumentBody = z.infer<typeof PostDocumentBody>

export const PostDocument = z.intersection(
  PostDocumentBody,
  z.object({
    id: PostIdSchema,
  }),
)

export type PostDocument = z.infer<typeof PostDocument>

export class PostDocuments {

  static toDocumentData(post: PostDocument): PostDocumentBody {
    return {
      user_id: post.user_id,
      author: post.author,
      body: post.body,
      display_period: post.display_period,
      display_period_state: post.display_period_state,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }
  }

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): PostDocument | null {
    const data = doc?.data()
    if (!doc || data === undefined) {
      return null
    }
    return {
      id: PostId(doc.id),
      user_id: data["user_id"],
      author: data["author"],
      body: data["body"],
      display_period: data["display_period"],
      display_period_state: data["display_period_state"],
      created_at: data["created_at"],
      updated_at: data["updated_at"],
    }
  }

}
