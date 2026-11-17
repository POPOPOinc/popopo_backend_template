import { z } from "zod/v4"
import type { DocumentSnapshotLike } from "../firestore"
import { AdminOperationId, PostIdSchema, UserIdSchema } from "../id"
import { Period } from "./common"
import { UserDenormalized, UserStatus } from "./user"

/**
 * 管理者操作ログ（監査ログ）の種別。
 * kind-value パターンで、様々な監査ログを格納できるようにする。
 */
export const AdminOperationKind = {
  updateUser: "update-user",
  updatePost: "update-post",
  deletePost: "delete-post",
} as const

export type AdminOperationKind = typeof AdminOperationKind[keyof typeof AdminOperationKind]

export const AdminOperationTargetKind = {
  user: "user",
  post: "post",
} as const

const AdminOperationTargetUser = z.object({
  kind: z.literal(AdminOperationTargetKind.user),
  value: UserDenormalized,
}).describe("操作対象（ユーザー）。value.id でフィルタすることで、特定のユーザーに対する操作履歴を取得できる。")

const AdminOperationTargetPost = z.object({
  kind: z.literal(AdminOperationTargetKind.post),
  value: z.object({
    id: PostIdSchema,
  }),
}).describe("操作対象（投稿）")

const UpdateUserOperationValue = z.object({
  user_id: UserIdSchema,
  display_name: z.string().optional(),
  status: UserStatus.optional(),
}).describe("ユーザー更新操作の詳細")

export type UpdateUserOperationValue = z.infer<typeof UpdateUserOperationValue>

const UpdatePostOperationValue = z.object({
  post_id: PostIdSchema,
  display_period: Period,
}).describe("投稿の表示期間の変更操作の詳細")

export type UpdatePostOperationValue = z.infer<typeof UpdatePostOperationValue>

const DeletePostOperationValue = z.object({
  post_id: PostIdSchema,
}).describe("投稿削除操作の詳細")

export type DeletePostOperationValue = z.infer<typeof DeletePostOperationValue>

const AdminOperationUser = z.object({
  id: z.string().describe("管理者の ID"),
  email: z.string().describe("操作時点の管理者のメールアドレス"),
}).describe("操作を実行した管理者の情報（非正規化・操作時点のスナップショット）")

export type AdminOperationUser = z.infer<typeof AdminOperationUser>

export const AdminOperationDocumentBody = z.union([
  z.object({
    kind: z.literal(AdminOperationKind.updateUser),
    value: UpdateUserOperationValue,
    target: AdminOperationTargetUser,
    admin_user: AdminOperationUser,
    created_at: z.number().describe("操作日時"),
  }),
  z.object({
    kind: z.literal(AdminOperationKind.updatePost),
    value: UpdatePostOperationValue,
    target: AdminOperationTargetPost,
    admin_user: AdminOperationUser,
    created_at: z.number().describe("操作日時"),
  }),
  z.object({
    kind: z.literal(AdminOperationKind.deletePost),
    value: DeletePostOperationValue,
    target: AdminOperationTargetPost,
    admin_user: AdminOperationUser,
    created_at: z.number().describe("操作日時"),
  }),
])

export type AdminOperationDocumentBody = z.infer<typeof AdminOperationDocumentBody>

export type AdminOperationDocument = AdminOperationDocumentBody & {
  id: AdminOperationId
}

export class AdminOperationDocuments {
  static toDocumentData(doc: AdminOperationDocument): object {
    return {
      ...doc,
      id: undefined,
    }
  }

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): AdminOperationDocument | null {
    if (!doc) {
      return null
    }
    const data = doc.data()
    if (data === undefined) {
      return null
    }
    const parsed = AdminOperationDocumentBody.safeParse(data)
    if (!parsed.success) {
      return null
    }
    return { ...parsed.data, id: AdminOperationId(doc.id) }
  }
}
