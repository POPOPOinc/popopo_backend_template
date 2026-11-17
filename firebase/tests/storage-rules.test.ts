import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing"
import { doc, setDoc } from "firebase/firestore"
import { getBytes, ref, uploadBytes, uploadString } from "firebase/storage"
import { readFileSync } from "fs"

let testEnv: RulesTestEnvironment

const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-template",
    firestore: { rules: readFileSync("src/firestore.rules", "utf8") },
    storage: { rules: readFileSync("src/storage.default.rules", "utf8") },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "admins/root"), { id: "root", email: "root@example.com", created_at: 0, updated_at: 0 })
    await uploadString(ref(context.storage(), "users/alice/icon"), "icon")
  })
})

const ops = { firebase: { sign_in_provider: "custom" as const, tenant: "ops-local" } }

describe("一時アップロードパス", () => {
  test("本人は画像を tmp に書き込める", async () => {
    await assertSucceeds(uploadBytes(ref(testEnv.authenticatedContext("alice").storage(), "tmp/users/alice/icon-uploaded"), image, { contentType: "image/png" }))
  })

  test("画像以外は書き込めない", async () => {
    await assertFails(uploadBytes(ref(testEnv.authenticatedContext("alice").storage(), "tmp/users/alice/icon-uploaded"), image, { contentType: "text/plain" }))
  })

  test("他人の tmp には書き込めない", async () => {
    await assertFails(uploadBytes(ref(testEnv.authenticatedContext("bob").storage(), "tmp/users/alice/icon-uploaded"), image, { contentType: "image/png" }))
  })
})

describe("公開パス", () => {
  test("誰でも読める", async () => {
    await assertSucceeds(getBytes(ref(testEnv.unauthenticatedContext().storage(), "users/alice/icon")))
  })

  test("本人でも直接は書き込めない", async () => {
    await assertFails(uploadBytes(ref(testEnv.authenticatedContext("alice").storage(), "users/alice/icon"), image, { contentType: "image/png" }))
  })
})

describe("管理者の catch-all read", () => {
  test("admins に登録された manage テナントのユーザーは tmp も読める", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await uploadBytes(ref(context.storage(), "tmp/users/alice/icon-uploaded"), image, { contentType: "image/png" })
    })
    await assertSucceeds(getBytes(ref(testEnv.authenticatedContext("root", ops).storage(), "tmp/users/alice/icon-uploaded")))
  })

  test("テナントのユーザーでも admins に登録されていなければ読めない", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await uploadBytes(ref(context.storage(), "tmp/users/alice/icon-uploaded"), image, { contentType: "image/png" })
    })
    await assertFails(getBytes(ref(testEnv.authenticatedContext("mallory", ops).storage(), "tmp/users/alice/icon-uploaded")))
  })
})
