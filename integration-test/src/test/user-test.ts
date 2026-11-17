import { describe, expect } from "@jest/globals"
import { AppUser } from "../app-user"
import { testAlways } from "../core"
import { registerUser, updateUser } from "schema/api/app"

describe("user", () => {
  testAlways("会員登録すると users/{uid} をクライアントから直接読める", async () => {
    const user = await AppUser.login("alice")
    const doc = await user.firestoreAccess.getUser(user.id)
    expect(doc?.display_name).toBe("alice")
    expect(doc?.status).toBe("active")
    await user.logout()
  })

  testAlways("二重登録は 409", async () => {
    const user = await AppUser.login("bob")
    const { response } = await registerUser({ client: user.api, body: { display_name: "bob" } })
    expect(response?.status).toBe(409)
    await user.logout()
  })

  testAlways("未登録ユーザーは更新できない", async () => {
    const user = await AppUser.loginWithoutRegister("carol")
    const { response } = await updateUser({ client: user.api, body: { display_name: "carol2" } })
    expect(response?.status).toBe(401)
    await user.logout()
  })

  testAlways("表示名を更新できる", async () => {
    const user = await AppUser.login("dave")
    const { error } = await updateUser({ client: user.api, body: { display_name: "dave2" } })
    expect(error).toBeUndefined()
    expect((await user.firestoreAccess.getUser(user.id))?.display_name).toBe("dave2")
    await user.logout()
  })
})
