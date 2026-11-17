import { z } from "zod/v4"
import type { DocumentSnapshotLike } from "../firestore"
import { UpdatedAt } from "./system"

/**
 * ユーザー本人だけが読み書きする設定（users/{userId}/settings/preferences）。
 * サーバーでの検証がいらないので、API を通さずクライアントから直接書き込む（firebase/src/firestore.rules で守る）
 */
export const UserPreferencesDocumentBody = z.object({
  notification_enabled: z.boolean().describe("通知を受け取るか"),
  updated_at: UpdatedAt,
})

export type UserPreferencesDocumentBody = z.infer<typeof UserPreferencesDocumentBody>

export class UserPreferencesDocuments {

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): UserPreferencesDocumentBody | null {
    const data = doc?.data()
    if (!doc || data === undefined) {
      return null
    }
    return {
      notification_enabled: data["notification_enabled"] ?? false,
      updated_at: data["updated_at"],
    }
  }

}
