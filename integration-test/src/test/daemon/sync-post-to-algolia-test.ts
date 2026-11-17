import { afterAll, beforeAll, describe, expect } from "@jest/globals"
import { AppUser } from "../../app-user"
import { required, testOnlyEmulator } from "../../core"
import { AlgoliaFakeServer } from "../../util/algolia-fake-server/server"
import { runDaemonUntilMatchingTheCondition } from "../../util/test-helpers/daemon-runner"
import { createPost, deletePost } from "schema/api/app"

describe("daemon: consumeSyncPostToAlgoliaTask", () => {
  const algolia = new AlgoliaFakeServer()
  let port = 0

  beforeAll(async () => {
    port = await algolia.listen()
  })

  afterAll(async () => {
    await algolia.close()
  })

  testOnlyEmulator("投稿の作成と削除が、tasks 経由で Algolia の posts に反映される", "daemon をテストから起動するため", async () => {
    const user = await AppUser.login("algolia-poster")
    const { data, error } = await createPost({ client: user.api, body: { body: "algolia-post" } })
    expect(error).toBeUndefined()
    const postId = required(data).id
    const options = { configOverride: { algolia: { appId: "fake-app", "apiKey!": "fake-key", host: `127.0.0.1:${port}` } } }

    const saved = await runDaemonUntilMatchingTheCondition(
      "consumeSyncPostToAlgoliaTask",
      async () => algolia.getObject("posts", postId)?.body === "algolia-post",
      options,
    )
    expect(saved.conditionMet).toBe(true)

    const { response } = await deletePost({ client: user.api, path: { post_id: postId } })
    expect(response?.status).toBe(200)
    const deleted = await runDaemonUntilMatchingTheCondition(
      "consumeSyncPostToAlgoliaTask",
      async () => algolia.getObject("posts", postId) === undefined,
      options,
    )
    expect(deleted.conditionMet).toBe(true)
    await user.logout()
  }, 60000)
})
