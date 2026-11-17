import type { DecodedIdToken } from "firebase-admin/auth"
import type { AdminDocument, UserDocument } from "schema"

/**
 * Firebase 認証後のリクエストコンテキスト。
 * loginFirebase で生成され、loginService / loginManage に引き渡される。
 */
export type FirebaseRequestContext = {
  type: "manage" | "service"
  idToken: string
  firebase: DecodedIdToken
}

/**
 * Service API のリクエストコンテキスト。
 * controller 層で認証・ユーザー取得済みの情報を保持し、use-case 層に引き渡す。
 */
export type ServiceRequestContext = {
  /** Firestore のユーザードキュメント */
  user: UserDocument
}

/**
 * Manage API のリクエストコンテキスト。
 * controller 層で認証済みの管理者情報を保持し、use-case 層に引き渡す。
 */
export type ManageRequestContext = {
  /** Firestore の管理者ドキュメント */
  admin: AdminDocument
  /** Firebase Auth から取得した認証情報 */
  firebase: {
    uid: string
    name?: string
    email?: string
  }
}
