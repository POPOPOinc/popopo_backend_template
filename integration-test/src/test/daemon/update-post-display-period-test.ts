import { describe, expect } from "@jest/globals"
import { PostId } from "schema"
import { AppUser } from "../../app-user"
import { required, testOnlyEmulator } from "../../core"
import { runDaemonUntilMatchingTheCondition } from "../../util/test-helpers/daemon-runner"
import { createPost } from "schema/api/app"

describe("daemon: updatePostDisplayPeriod", () => {
  testOnlyEmulator("表示期間の開始と終了で、daemon が display_period_state を更新する", "daemon をテストから起動するため", async () => {
    const author = await AppUser.login("period-author")
    const reader = await AppUser.login("period-reader")
    const startAt = Date.now() + 2000
    const endAt = startAt + 3000
    const { data, error } = await createPost({ client: author.api, body: { body: "period", display_period: { start_at: startAt, end_at: endAt } } })
    expect(error).toBeUndefined()
    const postId = PostId(required(data).id)

    // 開始前: 投稿者だけが読める
    expect((await author.firestoreAccess.getPost(postId))?.display_period_state).toEqual({ active: false, next_change_at: startAt })
    await expect(reader.firestoreAccess.getPost(postId)).rejects.toThrow()

    // 開始: active になり、ほかのユーザーも読める
    const opened = await runDaemonUntilMatchingTheCondition(
      "updatePostDisplayPeriod",
      async () => (await author.firestoreAccess.getPost(postId))?.display_period_state.active === true,
    )
    expect(opened.conditionMet).toBe(true)
    expect((await reader.firestoreAccess.getPost(postId))?.display_period_state).toEqual({ active: true, next_change_at: endAt })

    // 終了: active が false に戻り、ほかのユーザーは読めなくなる
    const closed = await runDaemonUntilMatchingTheCondition(
      "updatePostDisplayPeriod",
      async () => (await author.firestoreAccess.getPost(postId))?.display_period_state.active === false,
    )
    expect(closed.conditionMet).toBe(true)
    expect((await author.firestoreAccess.getPost(postId))?.display_period_state).toEqual({ active: false, next_change_at: null })
    await expect(reader.firestoreAccess.getPost(postId)).rejects.toThrow()
    await author.logout()
    await reader.logout()
  }, 60000)
})
