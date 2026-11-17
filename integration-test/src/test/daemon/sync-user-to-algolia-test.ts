import { afterAll, beforeAll, describe, expect } from "@jest/globals"
import { AppUser } from "../../app-user"
import { testOnlyEmulator } from "../../core"
import { AlgoliaFakeServer } from "../../util/algolia-fake-server/server"
import { runDaemonUntilMatchingTheCondition } from "../../util/test-helpers/daemon-runner"
import { updateUser } from "schema/api/app"

describe("daemon: consumeSyncUserToAlgoliaTask", () => {
  const algolia = new AlgoliaFakeServer()
  let port = 0

  beforeAll(async () => {
    port = await algolia.listen()
  })

  afterAll(async () => {
    await algolia.close()
  })

  testOnlyEmulator("表示名を更新すると、tasks 経由で Algolia の users に反映される", "daemon をテストから起動するため", async () => {
    const user = await AppUser.login("algolia")
    const { error } = await updateUser({ client: user.api, body: { display_name: "algolia-renamed" } })
    expect(error).toBeUndefined()

    const result = await runDaemonUntilMatchingTheCondition(
      "consumeSyncUserToAlgoliaTask",
      async () => algolia.getObject("users", user.id)?.display_name === "algolia-renamed",
      { configOverride: { algolia: { appId: "fake-app", "apiKey!": "fake-key", host: `127.0.0.1:${port}` } } },
    )
    expect(result.conditionMet).toBe(true)
    await user.logout()
  }, 60000)
})
