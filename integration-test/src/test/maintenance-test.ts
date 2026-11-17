import { afterEach, describe, expect } from "@jest/globals"
import { AppUser } from "../app-user"
import { testOnlyEmulator } from "../core"
import { FirebaseAdminUser } from "../firebase-admin-user"
import { createPost } from "schema/api/app"

// メンテナンスは全ユーザーの API を止めるため、CI では integration-test-maintenance.yml で単独に回す
describe("メンテナンスモード（app-configs/maintenance）", () => {
  afterEach(async () => {
    await FirebaseAdminUser.setMaintenance(null)
  })

  testOnlyEmulator("maintenance の間はサービス API が 503 UNDER_MAINTENANCE", "app-configs/maintenance をテストから書き換えるため", async () => {
    const user = await AppUser.login("maintenance")
    await FirebaseAdminUser.setMaintenance("maintenance")
    const { response, error } = await createPost({ client: user.api, body: { body: "x" } })
    expect(response?.status).toBe(503)
    expect(error?.kind).toBe("UNDER_MAINTENANCE")
    await user.logout()
  })

  testOnlyEmulator("internal-check の間は internal_users だけが使える", "app-configs/maintenance をテストから書き換えるため", async () => {
    const internal = await AppUser.login("internal")
    const other = await AppUser.login("other")
    await FirebaseAdminUser.setMaintenance("internal-check", [internal.id])
    expect((await createPost({ client: internal.api, body: { body: "ok" } })).response?.status).toBe(200)
    expect((await createPost({ client: other.api, body: { body: "ng" } })).response?.status).toBe(503)
    await internal.logout()
    await other.logout()
  })
})
