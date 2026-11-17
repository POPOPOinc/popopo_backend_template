import { initializeApp } from "firebase/app"
import * as FirebaseAuth from "firebase/auth"
import * as Firestore from "firebase/firestore"
import { createClient, createConfig } from "schema/api/manage/client"
import { config } from "~/config"

const app = initializeApp(config.firebase)

export const auth = FirebaseAuth.getAuth(app)
export const firestore = Firestore.getFirestore(app)

if (config.tenantId !== undefined) {
  auth.tenantId = config.tenantId
}

if (config.env === "local") {
  console.info("[manage] connect to emulator...")
  FirebaseAuth.connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })
  Firestore.connectFirestoreEmulator(firestore, "localhost", 8080)
}

export const apiManage = createClient(createConfig({
  baseUrl: config.apiUrl,
  auth: async () => await auth.currentUser?.getIdToken(),
}))
