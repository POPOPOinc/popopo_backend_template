import { Firestore } from "firebase-admin/firestore"
import { AppConfigMaintenanceDocumentBody, FirestorePaths, MaintenanceDocuments } from "schema"

export class MaintenanceAccess {
  constructor(
    public readonly firestore: Firestore
  ) {
  }

  private getMaintenanceDocument() {
    return this.firestore.doc(FirestorePaths.AppConfigs.getDocPath(MaintenanceDocuments.DOCUMENT_ID))
  }

  async getMaintenanceDocWithoutTransaction(): Promise<AppConfigMaintenanceDocumentBody> {
    const doc = await this.getMaintenanceDocument().get()
    return MaintenanceDocuments.fromDocumentSnapshot(doc) ?? { schedules: [] }
  }
}
