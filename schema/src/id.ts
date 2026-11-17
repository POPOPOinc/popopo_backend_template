import { z } from "zod/v4"

declare class Id<T extends string> {
  private IDENTITY: T
}

// Firestore ドキュメント ID として有効な文字列かどうかを検証するスキーマ
// Firestore の制限:
// - 空文字列は不可
// - `/` を含むことは不可（パス区切り文字として解釈される）
// - `.` または `..` のみは不可
// - `__.*__` にマッチすることは不可（予約済み）
export const FirestoreDocumentIdSchema = z.string()
  .min(1, "IDは空文字列にできません")
  .refine(s => !s.includes("/"), "IDにスラッシュを含むことはできません")
  .refine(s => s !== "." && s !== "..", "IDは単一または二重ピリオドのみにできません")
  .refine(s => !/^__.*__$/.test(s), "IDは__で囲まれた文字列にできません")

export type UserId = Id<"User"> & string

export function UserId(id: string): UserId {
  return id as UserId
}

export const UserIdSchema = FirestoreDocumentIdSchema.describe("ユーザー ID（Firebase Auth の uid）").transform(UserId)

export type PostId = Id<"Post"> & string

export function PostId(id: string): PostId {
  return id as PostId
}

export const PostIdSchema = FirestoreDocumentIdSchema.describe("投稿 ID").transform(PostId)

export type AdminId = Id<"Admin"> & string

export function AdminId(id: string): AdminId {
  return id as AdminId
}

export const AdminIdSchema = FirestoreDocumentIdSchema.describe("管理者 ID（Firebase Auth の uid）").transform(AdminId)

export type AdminOperationId = Id<"AdminOperation"> & string

export function AdminOperationId(id: string): AdminOperationId {
  return id as AdminOperationId
}


export type TaskId = Id<"Task"> & string

export function TaskId(id: string): TaskId {
  return id as TaskId
}

