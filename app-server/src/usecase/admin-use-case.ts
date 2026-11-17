import { AdminDocument, AdminId } from "schema"
import { FirestoreAccess } from "../access/firestore-access"

export class AdminUseCase {

  constructor(
    private readonly firestoreAccess: FirestoreAccess,
  ) {
  }

  async get(adminId: AdminId): Promise<AdminDocument | null> {
    return this.firestoreAccess.admin.getAdminById(null, adminId)
  }

}
