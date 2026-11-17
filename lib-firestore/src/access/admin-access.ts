import { Firestore, Transaction } from "firebase-admin/firestore"
import { AdminDocument, AdminDocuments, AdminId, FirestorePaths } from "schema"
import { FirestoreUtil } from "../lib/firestore-utils"

export class AdminAccess {

  constructor(
    public readonly firestore: Firestore,
  ) {
  }

  async getAdminById(tx: Transaction | null, id: AdminId): Promise<AdminDocument | null> {
    const snapshot = await FirestoreUtil.get(tx, this.firestore.doc(FirestorePaths.Admins.getDocPath(id)))
    return AdminDocuments.fromDocumentSnapshot(snapshot)
  }

}
