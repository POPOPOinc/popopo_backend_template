import { describe, expect } from "@jest/globals"
import { PostId } from "schema"
import { AppUser } from "../app-user"
import { required, testAlways, testOnlyEmulator } from "../core"
import { ManageUser } from "../manage-user"
import { createPost } from "schema/api/app"
import { manageDeletePost, manageGetUserAuth, manageUpdatePost, manageUpdateUser } from "schema/api/manage"

describe("manage", () => {
  testOnlyEmulator("管理者は users を直接読み、API でユーザーを BAN できる", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("admin")
    const user = await AppUser.login("target")
    expect((await admin.firestoreAccess.getUser(user.id))?.display_name).toBe("target")
    expect(await admin.firestoreAccess.getAdmin(admin.id)).not.toBeNull()

    const { error } = await manageUpdateUser({
      client: admin.api,
      path: { user_id: user.id },
      body: { display_name: "target", status: "banned" },
    })
    expect(error).toBeUndefined()
    expect((await admin.firestoreAccess.getUser(user.id))?.status).toBe("banned")
    expect((await createPost({ client: user.api, body: { body: "x" } })).response?.status).toBe(403)

    const auth = await manageGetUserAuth({ client: admin.api, path: { user_id: user.id } })
    expect(auth.data?.uid).toBe(user.id)
    await admin.logout()
    await user.logout()
  })

  testOnlyEmulator("管理者は投稿を削除できる", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("admin")
    const user = await AppUser.login("poster")
    const { data } = await createPost({ client: user.api, body: { body: "spam" } })
    const { response } = await manageDeletePost({ client: admin.api, path: { post_id: required(data).id } })
    expect(response?.status).toBe(200)
    expect(await user.firestoreAccess.getPost(PostId(required(data).id))).toBeNull()
    await admin.logout()
    await user.logout()
  })

  testOnlyEmulator("DeletePost の権限がない管理者は投稿を削除できない", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("limited-admin", { registerAdmin: true, permission: { kind: "some", values: ["EditUser"] } })
    const user = await AppUser.login("poster2")
    const { data } = await createPost({ client: user.api, body: { body: "keep" } })
    const { response } = await manageDeletePost({ client: admin.api, path: { post_id: required(data).id } })
    expect(response?.status).toBe(403)
    expect(await user.firestoreAccess.getPost(PostId(required(data).id))).not.toBeNull()
    await admin.logout()
    await user.logout()
  })

  testOnlyEmulator("管理者は投稿の表示期間を変更でき、display_period_state も計算し直される", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("admin")
    const user = await AppUser.login("period-poster")
    const { data } = await createPost({ client: user.api, body: { body: "period" } })
    const postId = PostId(required(data).id)
    const startAt = Date.now() + 60 * 60 * 1000
    const { error } = await manageUpdatePost({
      client: admin.api,
      path: { post_id: postId },
      body: { display_period: { start_at: startAt, end_at: null } },
    })
    expect(error).toBeUndefined()
    const post = await admin.firestoreAccess.getPost(postId)
    expect(post?.display_period).toEqual({ start_at: startAt, end_at: null })
    expect(post?.display_period_state).toEqual({ active: false, next_change_at: startAt })
    await admin.logout()
    await user.logout()
  })

  testOnlyEmulator("EditPost の権限がない管理者は投稿の表示期間を変更できない", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("no-edit-post-admin", { registerAdmin: true, permission: { kind: "some", values: ["DeletePost"] } })
    const user = await AppUser.login("period-poster2")
    const { data } = await createPost({ client: user.api, body: { body: "period" } })
    const { response } = await manageUpdatePost({
      client: admin.api,
      path: { post_id: required(data).id },
      body: { display_period: { start_at: Date.now() + 60 * 60 * 1000, end_at: null } },
    })
    expect(response?.status).toBe(403)
    expect((await user.firestoreAccess.getPost(PostId(required(data).id)))?.display_period_state.active).toBe(true)
    await admin.logout()
    await user.logout()
  })

  testOnlyEmulator("EditUser の権限がない管理者はユーザーを更新できず、Auth の情報も取得できない", "admins をテストから作成するため", async () => {
    const admin = await ManageUser.login("no-edit-admin", { registerAdmin: true, permission: { kind: "some", values: ["DeletePost"] } })
    const user = await AppUser.login("target2")
    const put = await manageUpdateUser({
      client: admin.api,
      path: { user_id: user.id },
      body: { display_name: "target2", status: "banned" },
    })
    expect(put.response?.status).toBe(403)
    expect((await admin.firestoreAccess.getUser(user.id))?.status).toBe("active")
    const auth = await manageGetUserAuth({ client: admin.api, path: { user_id: user.id } })
    expect(auth.response?.status).toBe(403)
    await admin.logout()
    await user.logout()
  })

  testAlways("admins に登録されていないと manage API は 401", async () => {
    const notAdmin = await ManageUser.login("not-admin", { registerAdmin: false })
    const { response } = await manageDeletePost({ client: notAdmin.api, path: { post_id: "x" } })
    expect(response?.status).toBe(401)
    await notAdmin.logout()
  })
})
