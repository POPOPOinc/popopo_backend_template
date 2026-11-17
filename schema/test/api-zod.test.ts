import { describe, expect, test } from "@jest/globals"
import { z } from "zod/v4"
import { zRegisterUserRequest } from "../src/api/app/zod.gen"
import { maxLengthOf } from "../src/firestore/common"
import { Posts } from "../src/firestore/post"
import { Users } from "../src/firestore/user"

describe("format: user-free-input", () => {
  test("前後の空白を除いてから長さを検査する", () => {
    expect(zRegisterUserRequest.parse({ display_name: "  名前  " })).toEqual({ display_name: "名前" })
    expect(zRegisterUserRequest.safeParse({ display_name: "   " }).success).toBe(false)
    expect(zRegisterUserRequest.safeParse({ display_name: ` ${"a".repeat(32)} ` }).success).toBe(true)
    expect(zRegisterUserRequest.safeParse({ display_name: "a".repeat(33) }).success).toBe(false)
  })
})

describe("maxLengthOf", () => {
  test("yml の maxLength を定数として読む", () => {
    expect(Users.DISPLAY_NAME_MAX_LENGTH).toBe(32)
    expect(Posts.BODY_MAX_LENGTH).toBe(280)
  })

  test("maxLength がなければ throw する", () => {
    expect(() => maxLengthOf(z.string())).toThrow()
  })
})
