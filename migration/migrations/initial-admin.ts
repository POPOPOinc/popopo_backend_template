import { config, firebase, firestore } from "#config"
import { getAuth } from "firebase-admin/auth"
import { onMigrate } from "#core/dsl"
import { AdminDocuments, AdminId, FirestorePaths, UserDocuments, UserId } from "schema"

/** ローカル開発用の管理者とユーザーを作成する。エミュレータ以外では何もしない */
export const initialLocalAdmin = onMigrate(async tx => {
  if (!config.isEmulator) {
    return
  }
  const now = Date.now()
  const id = "local-admin"
  // ローカル管理者のログイン用アカウント（admin@example.com / password）。manage は ops テナントでログインする
  await getAuth(firebase).tenantManager().authForTenant(config.ops.tenantId).createUser({ uid: id, email: "admin@example.com", password: "password" }).catch(() => undefined)
  tx.create(firestore.doc(FirestorePaths.Admins.getDocPath(AdminId(id))), AdminDocuments.toDocumentData({
    id: AdminId(id),
    email: "admin@example.com",
    permission: { kind: "all" },
    created_at: now,
    updated_at: now,
  }))
  tx.create(firestore.doc(FirestorePaths.Users.getDocPath(UserId(id))), UserDocuments.toDocumentData({
    id: UserId(id),
    display_name: "Local Admin",
    status: "active",
    created_at: now,
    updated_at: now,
  }))
})
