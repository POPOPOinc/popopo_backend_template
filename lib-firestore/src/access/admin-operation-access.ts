import { Firestore, Transaction } from "firebase-admin/firestore"
import { AdminOperationDocumentBody, AdminOperationId, FirestorePaths } from "schema"

/** 管理者操作ログ（監査ログ）。管理系 API の更新と同じトランザクションで書き込む */
export class AdminOperationAccess {
  constructor(
    public readonly firestore: Firestore
  ) {
  }

  createAdminOperation(tx: Transaction, body: AdminOperationDocumentBody): AdminOperationId {
    const doc = this.firestore.collection(FirestorePaths.AdminOperations.path).doc()
    tx.create(doc, body)
    return AdminOperationId(doc.id)
  }
}
