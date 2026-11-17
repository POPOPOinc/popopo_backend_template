import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing"
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { readFileSync } from "fs"

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-template",
    firestore: { rules: readFileSync("src/firestore.rules", "utf8") },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, "users/alice"), { id: "alice", display_name: "Alice", created_at: 0, updated_at: 0 })
    await setDoc(doc(db, "admins/root"), { id: "root", email: "root@example.com", created_at: 0, updated_at: 0 })
    await setDoc(doc(db, "admins/auditor"), { id: "auditor", email: "auditor@example.com", permission: { kind: "some", values: ["ViewAdminAuditLog"] }, created_at: 0, updated_at: 0 })
    await setDoc(doc(db, "admins/editor"), { id: "editor", email: "editor@example.com", permission: { kind: "some", values: ["EditUser"] }, created_at: 0, updated_at: 0 })
    await setDoc(doc(db, "migrations/initial"), { created_at: 0, updated_at: 0 })
    await setDoc(doc(db, "admin-operations/op1"), { kind: "updateUser", created_at: 0 })
  })
})

describe("users", () => {
  test("ログインユーザーは読み取れる", async () => {
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "users/alice")))
  })

  test("未ログインでは読み取れない", async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users/alice")))
  })

  test("本人でもクライアントから書き込めない", async () => {
    await assertFails(setDoc(doc(testEnv.authenticatedContext("alice").firestore(), "users/alice"), { display_name: "Hacked" }))
  })
})

describe("posts（表示期間）", () => {
  const post = (active: boolean) => ({
    user_id: "alice",
    body: "hello",
    display_period: { start_at: 0, end_at: null },
    display_period_state: { active, next_change_at: null },
    created_at: 0,
    updated_at: 0,
  })

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await setDoc(doc(db, "posts/active"), post(true))
      await setDoc(doc(db, "posts/inactive"), post(false))
    })
  })

  test("表示期間内の投稿はログインユーザーが読める", async () => {
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "posts/active")))
  })

  test("表示期間外の投稿は投稿者以外は読めない", async () => {
    await assertFails(getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "posts/inactive")))
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("alice").firestore(), "posts/inactive")))
  })

  test("display_period_state.active == true の等値条件で list できる", async () => {
    const db = testEnv.authenticatedContext("bob").firestore()
    await assertSucceeds(getDocs(query(collection(db, "posts"), where("display_period_state.active", "==", true))))
  })

  test("ほかのユーザーの投稿一覧は、user_id と display_period_state.active == true で list できる", async () => {
    const db = testEnv.authenticatedContext("bob").firestore()
    await assertSucceeds(getDocs(query(collection(db, "posts"), where("user_id", "==", "alice"), where("display_period_state.active", "==", true))))
    await assertFails(getDocs(query(collection(db, "posts"), where("user_id", "==", "alice"))))
  })

  test("投稿者本人は、表示期間外も含めて自分の投稿を list できる", async () => {
    const db = testEnv.authenticatedContext("alice").firestore()
    await assertSucceeds(getDocs(query(collection(db, "posts"), where("user_id", "==", "alice"))))
  })

  test("条件なしの list は、表示期間外の投稿を含みうるので拒否される", async () => {
    await assertFails(getDocs(collection(testEnv.authenticatedContext("bob").firestore(), "posts")))
  })
})

describe("その他のコレクション", () => {
  test("管理者は読み取れる", async () => {
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("root").firestore(), "migrations/initial")))
  })

  test("一般ユーザーは読み取れない", async () => {
    await assertFails(getDoc(doc(testEnv.authenticatedContext("alice").firestore(), "migrations/initial")))
  })
})

describe("users/{userId}/settings/preferences（クライアントから直接 write する例）", () => {
  const path = "users/alice/settings/preferences"

  test("本人は決められたフィールドを書き込める", async () => {
    await assertSucceeds(setDoc(doc(testEnv.authenticatedContext("alice").firestore(), path), { notification_enabled: true, updated_at: Date.now() }))
  })

  test("決められていないフィールドは書き込めない", async () => {
    await assertFails(setDoc(doc(testEnv.authenticatedContext("alice").firestore(), path), { notification_enabled: true, updated_at: Date.now(), role: "admin" }))
  })

  test("updated_at がサーバーの時刻から大きくずれていると書き込めない", async () => {
    await assertFails(setDoc(doc(testEnv.authenticatedContext("alice").firestore(), path), { notification_enabled: true, updated_at: Date.now() - 60 * 60 * 1000 }))
  })

  test("型が違うと書き込めない", async () => {
    await assertFails(setDoc(doc(testEnv.authenticatedContext("alice").firestore(), path), { notification_enabled: "yes", updated_at: Date.now() }))
  })

  test("他人の設定は書き込めず、読み取れない", async () => {
    const db = testEnv.authenticatedContext("bob").firestore()
    await assertFails(setDoc(doc(db, path), { notification_enabled: true, updated_at: Date.now() }))
    await assertFails(getDoc(doc(db, path)))
  })
})

describe("admin-operations（監査ログ）", () => {
  const path = "admin-operations/op1"

  test("全権限の管理者は読み取れる", async () => {
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("root").firestore(), path)))
  })

  test("ViewAdminAuditLog の権限を持つ管理者は読み取れる", async () => {
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("auditor").firestore(), path)))
  })

  test("ViewAdminAuditLog の権限がない管理者は読み取れない", async () => {
    await assertFails(getDoc(doc(testEnv.authenticatedContext("editor").firestore(), path)))
  })

  test("一般ユーザーは読み取れない", async () => {
    await assertFails(getDoc(doc(testEnv.authenticatedContext("alice").firestore(), path)))
  })
})
