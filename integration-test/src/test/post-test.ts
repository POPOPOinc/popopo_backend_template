import { describe, expect } from "@jest/globals"
import { PostId } from "schema"
import { AppUser } from "../app-user"
import { required, testAlways } from "../core"
import { createPost, deletePost } from "schema/api/app"

describe("post", () => {
  testAlways("投稿すると posts/{id} をクライアントから直接読める", async () => {
    const user = await AppUser.login("poster")
    const { data, error } = await createPost({ client: user.api, body: { body: "hello" } })
    expect(error).toBeUndefined()
    const post = await user.firestoreAccess.getPost(PostId(required(data).id))
    expect(post?.body).toBe("hello")
    expect(post?.author.display_name).toBe("poster")
    const mine = await user.firestoreAccess.getPostsByUser(user.id, 10)
    expect(mine.map(x => x.id)).toContain(required(data).id)
    await user.logout()
  })

  testAlways("他人の投稿は削除できない", async () => {
    const owner = await AppUser.login("owner")
    const other = await AppUser.login("other")
    const { data } = await createPost({ client: owner.api, body: { body: "mine" } })
    const params = { path: { post_id: required(data).id } }
    expect((await deletePost({ client: other.api, ...params })).response?.status).toBe(403)
    expect((await deletePost({ client: owner.api, ...params })).response?.status).toBe(200)
    expect(await owner.firestoreAccess.getPost(PostId(required(data).id))).toBeNull()
    await owner.logout()
    await other.logout()
  })

  testAlways("空の投稿は 400", async () => {
    const user = await AppUser.login("empty")
    const { response } = await createPost({ client: user.api, body: { body: "" } })
    expect(response?.status).toBe(400)
    await user.logout()
  })
})
