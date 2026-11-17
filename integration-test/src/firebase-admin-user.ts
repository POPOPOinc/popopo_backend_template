import { getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { AdminDocuments, AdminId, AdminPermission, AppConfigMaintenanceDocumentBody, FirestorePaths, MaintenanceDocuments, MaintenanceScheduleStage } from "schema"
import { config } from "./core"

if (!getApps().length) {
  initializeApp({ projectId: config.firebase.projectId })
}

/** テストデータの準備・検証のために Admin SDK を使う */
export class FirebaseAdminUser {

  static readonly auth = getAuth()

  static readonly manageAuth = getAuth().tenantManager().authForTenant(config.ops.tenantId)

  // 警告: このメソッドを public に変更しないでください
  // Firestore への直接アクセスが必要な場合は、テスト専用の public ヘルパーメソッドを追加してください
  private static firestore() {
    return getFirestore()
  }

  /** app-configs/maintenance に、指定した stage のメンテナンスを 1 件だけ設定する（null で解除） */
  static async setMaintenance(stage: MaintenanceScheduleStage | null, internalUserIds: string[] = []) {
    const now = Date.now()
    const body: AppConfigMaintenanceDocumentBody = {
      schedules: stage === null ? [] : [{ id: "test", title: "integration-test", active: true, stage, status: "public", created_at: now, updated_at: now }],
      internal_users: internalUserIds.map(user_id => ({ user_id, note: "integration-test", created_at: now, updated_at: now })),
    }
    await FirebaseAdminUser.firestore()
      .doc(FirestorePaths.AppConfigs.getDocPath(MaintenanceDocuments.DOCUMENT_ID))
      .set(body)
  }

  static async registerAdmin(uid: string, permission: AdminPermission = { kind: "all" }) {
    const now = Date.now()
    await FirebaseAdminUser.firestore()
      .doc(FirestorePaths.Admins.getDocPath(AdminId(uid)))
      .set(AdminDocuments.toDocumentData({ id: AdminId(uid), email: `${uid}@example.com`, permission, created_at: now, updated_at: now }))
  }

}
