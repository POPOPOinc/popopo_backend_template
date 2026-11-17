import { QueryDocumentSnapshot } from "firebase-admin/firestore"

export type QuerySnapshotLike<E> = {
  readonly docs: QueryDocumentSnapshot<E>[]
}

export * from "./lib/wait-for"
export * from "./lib/walk"
export { FirestoreUtil } from "./lib/firestore-utils"
export { AdminAccess } from "./access/admin-access"
export { PostAccess, type PostPage } from "./access/post-access"
export { UserAccess } from "./access/user-access"
export { TaskAccess } from "./access/task-access"
export { AdminOperationAccess } from "./access/admin-operation-access"
export { MaintenanceAccess } from "./access/maintenance-access"
