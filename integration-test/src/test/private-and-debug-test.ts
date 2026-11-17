import { describe, expect } from "@jest/globals"
import { createDebugClient, createPrivateApiClient } from "../api"
import { AppUser } from "../app-user"
import { testOnlyEmulator, testWithEnvironment } from "../core"
import { debugUpdateMyStatus } from "schema/api/debug"
import { ping } from "schema/api/private"

describe("private API", () => {
  testOnlyEmulator("ローカルからの ping は通る", "プライベート IP から呼べるのはローカルだけのため", async () => {
    const { data } = await ping({ client: createPrivateApiClient() })
    expect(data?.message).toBe("pong")
  })

  testWithEnvironment("外部 IP からの ping は 404", "beta", async () => {
    const { response } = await ping({ client: createPrivateApiClient(), query: { __ip: "8.8.8.8" } as never })
    expect(response?.status).toBe(404)
  })
})

describe("debug API", () => {
  testWithEnvironment("debug で自分の status を変更できる", "beta", async () => {
    const user = await AppUser.login("debug")
    const debug = createDebugClient(() => user.idToken())
    const { error } = await debugUpdateMyStatus({ client: debug, body: { status: "banned" } })
    expect(error).toBeUndefined()
    expect((await user.firestoreAccess.getUser(user.id))?.status).toBe("banned")
    await user.logout()
  })
})
