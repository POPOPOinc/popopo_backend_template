import { z } from "zod/v4"
import { UserId, UserIdSchema } from "../id"
import type { DocumentSnapshotLike } from "../firestore"
import { zUserDisplayName } from "../api/app/zod.gen"
import { maxLengthOf } from "./common"
import { CreatedAt, UpdatedAt } from "./system"

export class Users {

  public static readonly DISPLAY_NAME_MAX_LENGTH = maxLengthOf(zUserDisplayName)

}

export const UserStatus = z.enum(["active", "banned"]).describe("利用状態。banned のユーザーは API を利用できない")

export type UserStatus = z.infer<typeof UserStatus>

export const UserDocumentBody = z.object({
  display_name: z.string().min(1).max(Users.DISPLAY_NAME_MAX_LENGTH).describe("表示名"),
  status: UserStatus,
  created_at: CreatedAt,
  updated_at: UpdatedAt,
})

export type UserDocumentBody = z.infer<typeof UserDocumentBody>

export const UserDocument = z.intersection(
  UserDocumentBody,
  z.object({
    id: UserIdSchema,
  }),
)

export type UserDocument = z.infer<typeof UserDocument>

/** 他のドキュメントに埋め込むための非正規化ユーザー情報 */
export const UserDenormalized = z.object({
  id: UserIdSchema,
  display_name: z.string().describe("表示名"),
})

export type UserDenormalized = z.infer<typeof UserDenormalized>

export class UserDocuments {

  static toDocumentData(user: UserDocument): UserDocumentBody {
    return {
      display_name: user.display_name,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  }

  static fromDocumentSnapshot(doc: DocumentSnapshotLike | null): UserDocument | null {
    const data = doc?.data()
    if (!doc || data === undefined) {
      return null
    }
    return {
      id: UserId(doc.id),
      display_name: data["display_name"],
      status: data["status"] ?? "active",
      created_at: data["created_at"],
      updated_at: data["updated_at"],
    }
  }

  static toDenormalized(user: UserDocument): UserDenormalized {
    return {
      id: user.id,
      display_name: user.display_name,
    }
  }

}
