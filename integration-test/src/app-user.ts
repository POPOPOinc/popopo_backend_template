import { deleteApp, FirebaseApp, initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth"
import { connectFirestoreEmulator, Firestore, getFirestore } from "firebase/firestore"
import { FirestoreAccess } from "lib-front/firestore-access"
import { UserId } from "schema"
import { createMainClient } from "./api"
import { config } from "./core"
import { FirebaseAdminUser } from "./firebase-admin-user"
import { registerUser } from "schema/api/app"

let counter = 0
export const generateUid = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`

/** アプリのユーザー。クライアント SDK でログインし、Firestore を直接読み、API で書き込む */
export class AppUser {

  public readonly firestoreAccess: FirestoreAccess
  public readonly api: ReturnType<typeof createMainClient>

  private constructor(
    public readonly id: UserId,
    public readonly raw: FirebaseApp,
    public readonly firestore: Firestore,
  ) {
    this.firestoreAccess = new FirestoreAccess(firestore)
    this.api = createMainClient(() => this.idToken())
  }

  /** Firebase Auth にログインする（会員登録はしない） */
  static async loginWithoutRegister(name: string): Promise<AppUser> {
    const uid = generateUid(name)
    const app = initializeApp({ ...config.firebase }, uid)
    const auth = getAuth(app)
    const firestore = getFirestore(app)
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true })
    }
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":")
      connectFirestoreEmulator(firestore, host, parseInt(port, 10))
    }
    await signInWithCustomToken(auth, await FirebaseAdminUser.auth.createCustomToken(uid))
    return new this(UserId(uid), app, firestore)
  }

  /** Firebase Auth にログインし、API で会員登録する */
  static async login(name: string): Promise<AppUser> {
    const user = await this.loginWithoutRegister(name)
    const { error } = await registerUser({ client: user.api, body: { display_name: name } })
    if (error) {
      throw new Error(`register failed: ${JSON.stringify(error)}`)
    }
    return user
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
