import { z } from "zod/v4"
import type { DocumentSnapshotLike } from "../firestore"

/** maintenance: 全ユーザーをブロック / internal-check: internal_users のみ許可 / released: 解除 */
export const MaintenanceScheduleStage = z.enum(["maintenance", "internal-check", "released"])

export type MaintenanceScheduleStage = z.infer<typeof MaintenanceScheduleStage>

export const MaintenanceScheduleEntry = z.object({
  id: z.string().describe("エントリの ID（ランダム文字列）"),
  title: z.string().describe("メンテナンスのタイトル（管理用）"),
  active: z.boolean().describe("人間が手動で設定し、true の場合はメンテナンス中として扱う"),
  stage: MaintenanceScheduleStage.describe("現在のメンテナンス段階"),
  status: z.enum(["public", "hidden"]).describe("public=有効、hidden=無効"),
  created_at: z.number(),
  updated_at: z.number(),
}).describe("メンテナンススケジュールエントリ")

export type MaintenanceScheduleEntry = z.infer<typeof MaintenanceScheduleEntry>

export const MaintenanceInternalUser = z.object({
  user_id: z.string().describe("ユーザー ID"),
  note: z.string().max(40).describe("備考（このユーザーが誰か、追加理由など。最大40文字）"),
  created_at: z.number(),
  updated_at: z.number(),
}).describe("内部確認ユーザー")

export type MaintenanceInternalUser = z.infer<typeof MaintenanceInternalUser>

export const AppConfigMaintenanceDocumentBody = z.object({
  schedules: z.array(MaintenanceScheduleEntry).describe("メンテナンススケジュールの配列（最大10件程度）"),
  internal_users: z.array(MaintenanceInternalUser).optional().describe("内部確認ユーザーの配列（internal-check 段階でアクセス可能なユーザー）"),
}).describe("メンテナンス管理ドキュメント。/app-configs/maintenance に保存される単一ドキュメントです。")

export type AppConfigMaintenanceDocumentBody = z.infer<typeof AppConfigMaintenanceDocumentBody>

export class MaintenanceDocuments {
  static readonly DOCUMENT_ID = "maintenance"

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): AppConfigMaintenanceDocumentBody | null {
    if (!doc) {
      return null
    }
    const data = doc.data()
    if (data === undefined) {
      return null
    }
    return {
      schedules: data["schedules"] ?? [],
      internal_users: data["internal_users"],
    }
  }

  static isUnderMaintenance(entry: MaintenanceScheduleEntry): boolean {
    if (entry.status !== "public") {
      return false
    }
    if (entry.stage === "released") {
      return false
    }
    return entry.active
  }

  static isInternalUser(doc: AppConfigMaintenanceDocumentBody, userId: string): boolean {
    return doc.internal_users?.some(u => u.user_id === userId) ?? false
  }
}
