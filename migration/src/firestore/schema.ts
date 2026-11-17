import { firestore } from "#config"
import { FirestorePaths, MigrationDocumentBody } from "schema"

export const migrations =
  firestore.collection(FirestorePaths.Migrations.path).withConverter({
    fromFirestore: e => MigrationDocumentBody.parse(e.data()),
    toFirestore: e => e,
  })
