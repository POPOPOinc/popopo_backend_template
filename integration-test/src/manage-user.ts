import { deleteApp, FirebaseApp, initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth"
import { connectFirestoreEmulator, Firestore, getFirestore } from "firebase/firestore"
import { FirestoreAccess } from "lib-front/firestore-access"
import { AdminId, AdminPermission } from "schema"
import { createManageClient } from "./api"
import { generateUid } from "./app-user"
import { config } from "./core"
import { FirebaseAdminUser } from "./firebase-admin-user"

/** manage の管理者。manage 用テナントでログインし、admins コレクションに登録されている */
export class ManageUser {

  public readonly firestoreAccess: FirestoreAccess
  public readonly api: ReturnType<typeof createManageClient>

  private constructor(
    public readonly id: AdminId,
    public readonly raw: FirebaseApp,
    public readonly firestore: Firestore,
  ) {
    this.firestoreAccess = new FirestoreAccess(firestore)
    this.api = createManageClient(() => this.idToken())
  }

  static async login(name: string, options: { registerAdmin: boolean, permission?: AdminPermission } = { registerAdmin: true }): Promise<ManageUser> {
    const uid = generateUid(name)
    if (options.registerAdmin) {
      await FirebaseAdminUser.registerAdmin(uid, options.permission)
    }
    const app = initializeApp({ ...config.firebase }, uid)
    const auth = getAuth(app)
    auth.tenantId = config.ops.tenantId
    const firestore = getFirestore(app)
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true })
    }
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":")
      connectFirestoreEmulator(firestore, host, parseInt(port, 10))
    }
    await signInWithCustomToken(auth, await FirebaseAdminUser.manageAuth.createCustomToken(uid))
    return new this(AdminId(uid), app, firestore)
  }

  async idToken(): Promise<string> {
    const token = await getAuth(this.raw).currentUser?.getIdToken()
    if (!token) {
      throw new Error("not logged in")
    }
    return token
  }

  async logout(): Promise<void> {
    await deleteApp(this.raw)
  }

}
