import { describe, expect, test } from "@jest/globals"
import { FirestorePaths } from "../src/firestore-paths"
import { PostId, UserId } from "../src/id"
import { PostDocumentBody } from "../src/firestore/post"

describe("FirestorePaths", () => {
  test("ドキュメントパスを組み立てられる", () => {
    expect(FirestorePaths.Users.getDocPath(UserId("u1"))).toBe("users/u1")
    expect(FirestorePaths.Posts.getDocPath(PostId("p1"))).toBe("posts/p1")
  })
})

describe("PostDocumentBody", () => {
  test("空の本文は不正", () => {
    const result = PostDocumentBody.safeParse({
      user_id: "u1",
      author: { id: "u1", display_name: "name" },
      body: "",
      created_at: 0,
      updated_at: 0,
    })
    expect(result.success).toBe(false)
  })
})
