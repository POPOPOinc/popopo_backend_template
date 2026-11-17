import { Firestore, Transaction } from "firebase-admin/firestore"
import { AdminAccess, AdminOperationAccess, MaintenanceAccess, PostAccess, TaskAccess, UserAccess } from "lib-firestore"

/** lib-firestore の各 Access を束ねる。Core.firestoreAccess.user のように参照する */
export class FirestoreAccess {

  readonly user: UserAccess
  readonly post: PostAccess
  readonly admin: AdminAccess
  readonly task: TaskAccess
  readonly adminOperation: AdminOperationAccess
  readonly maintenance: MaintenanceAccess

  constructor(
    public readonly firestore: Firestore,
  ) {
    this.user = new UserAccess(firestore)
    this.post = new PostAccess(firestore)
    this.admin = new AdminAccess(firestore)
    this.task = new TaskAccess(firestore)
    this.adminOperation = new AdminOperationAccess(firestore)
    this.maintenance = new MaintenanceAccess(firestore)
  }

  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(fn)
  }

}
