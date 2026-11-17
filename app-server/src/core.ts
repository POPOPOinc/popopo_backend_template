import { AppOptions, getApps, initializeApp } from "firebase-admin/app"
import { Auth, TenantAwareAuth, getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { AlgoliaAccess, AlgoliaAccessLike, FakeAlgoliaAccess } from "lib-server/algolia-access"
import { FirebaseStorageAccess } from "./access/firebase-storage-access"
import { FirestoreAccess } from "./access/firestore-access"
import { config } from "./config"
import { UserManagementUseCase } from "./usecase/manage/user-management-use-case"
import { AdminUseCase } from "./usecase/admin-use-case"
import { PostUseCase } from "./usecase/post-use-case"
import { UserUseCase } from "./usecase/user-use-case"

if (!getApps().length) {
  const options: AppOptions = {
    projectId: config.firebase.projectId,
  }
  initializeApp(options)
  getFirestore().settings({ ignoreUndefinedProperties: true })
}

/**
 * 依存性注入のコンテナ。
 * Access（永続化）は initialize() で生成し、UseCase は遅延初期化のシングルトンとして提供する。
 */
export class Core {

  public static firestoreAccess: FirestoreAccess
  private static algoliaAccess: AlgoliaAccessLike
  public static storageAccess: FirebaseStorageAccess

  public static readonly firebaseAuth: Auth = getAuth()

  /** manage（管理画面）のログインには Firebase Auth の別テナントを使う */
  public static readonly fireAuthManageTenant: TenantAwareAuth =
    getAuth().tenantManager().authForTenant(config.ops.tenantId)

  public static initialize() {
    Core.firestoreAccess = new FirestoreAccess(getFirestore())
    Core.algoliaAccess = Core.createAlgoliaAccess()
    Core.storageAccess = new FirebaseStorageAccess(getStorage())
  }

  private static createAlgoliaAccess(): AlgoliaAccessLike {
    const appId = config.algolia.appId
    const apiKey = config.algolia["apiKey!"]
    return appId !== "" && apiKey !== "" ? new AlgoliaAccess(appId, apiKey, "", config.algolia.host) : new FakeAlgoliaAccess()
  }

  public static get algolia(): AlgoliaAccessLike {
    return Core.algoliaAccess
  }

  private static _userUseCase?: UserUseCase
  public static get userUseCase(): UserUseCase {
    return Core._userUseCase ??= new UserUseCase(Core.firestoreAccess, Core.algolia)
  }

  private static _postUseCase?: PostUseCase
  public static get postUseCase(): PostUseCase {
    return Core._postUseCase ??= new PostUseCase(Core.firestoreAccess, Core.algolia, Core.storageAccess)
  }

  private static _adminUseCase?: AdminUseCase
  public static get adminUseCase(): AdminUseCase {
    return Core._adminUseCase ??= new AdminUseCase(Core.firestoreAccess)
  }

  private static _userManagementUseCase?: UserManagementUseCase
  public static get userManagementUseCase(): UserManagementUseCase {
    return Core._userManagementUseCase ??= new UserManagementUseCase(Core.firestoreAccess, Core.firebaseAuth)
  }

}
