import express from "express"
import { PostIdSchema } from "schema"
import type { CreatePostResponse, DeletePostResponse } from "schema/api/app/types"
import { zCreatePostRequest } from "schema/api/app/zod"
import { Core } from "../../../core"
import { Responses } from "../../../interfaces/response"
import { requireServiceLoginHandler } from "../controller"

export const postApp = express.Router()

postApp.post("/posts", requireServiceLoginHandler<CreatePostResponse>(async (req, args) => {
  const parsed = zCreatePostRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  return await Core.postUseCase.createPost(args.user, parsed.data)
}))

postApp.delete("/posts/:post_id", requireServiceLoginHandler<DeletePostResponse>(async (req, args) => {
  const parsedId = PostIdSchema.safeParse(req.params.post_id)
  if (!parsedId.success) {
    return Responses.errorBadRequest(parsedId.error.issues)
  }
  return await Core.postUseCase.deleteOwnPost(args.user, parsedId.data)
}))
