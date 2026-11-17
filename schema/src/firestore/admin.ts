import { z } from "zod/v4"
import { AdminId, AdminIdSchema } from "../id"
import type { DocumentSnapshotLike } from "../firestore"
import { CreatedAt, UpdatedAt } from "./system"

export const AdminPermissionType = {
  // ユーザーの編集（BAN を含む）
  EditUser: "EditUser",
  // 投稿の表示期間の変更
  EditPost: "EditPost",
  // 投稿の削除
  DeletePost: "DeletePost",
  // 監査ログ閲覧
  ViewAdminAuditLog: "ViewAdminAuditLog",
} as const

export type AdminPermissionType = typeof AdminPermissionType[keyof typeof AdminPermissionType]

export const convertAdminPermissionTypeToDisplayString = (permission: AdminPermissionType): string => {
  switch (permission) {
    case "EditUser":
      return "ユーザー編集"
    case "EditPost":
      return "投稿編集"
    case "DeletePost":
      return "投稿削除"
    case "ViewAdminAuditLog":
      return "監査ログ閲覧"
    default:
      return permission satisfies never
  }
}

export const AdminPermission = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("all"),
  }),
  z.object({
    kind: z.literal("some"),
    values: z.array(z.enum(AdminPermissionType)),
  }),
])

export type AdminPermission = z.infer<typeof AdminPermission>

export const AdminDocumentBody = z.object({
  email: z.string().describe("管理者のメールアドレス"),
  permission: AdminPermission.describe("管理者の権限。kind: all は全権限"),
  created_at: CreatedAt,
  updated_at: UpdatedAt,
})

export type AdminDocumentBody = z.infer<typeof AdminDocumentBody>

export const AdminDocument = z.intersection(
  AdminDocumentBody,
  z.object({
    id: AdminIdSchema,
  }),
)

export type AdminDocument = z.infer<typeof AdminDocument>

export class AdminDocuments {

  static toDocumentData(admin: AdminDocument): AdminDocumentBody {
    return {
      email: admin.email,
      permission: admin.permission,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    }
  }

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): AdminDocument | null {
    const data = doc?.data()
    if (!doc || data === undefined) {
      return null
    }
    return {
      id: AdminId(doc.id),
      email: data["email"],
      // permission が未設定の管理者は全権限として扱う
      permission: data["permission"] ?? { kind: "all" },
      created_at: data["created_at"],
      updated_at: data["updated_at"],
    }
  }

}
