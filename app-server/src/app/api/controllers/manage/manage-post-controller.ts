import express from "express"
import { AdminPermissionType, PostIdSchema } from "schema"
import type { ManageDeletePostResponse, ManageUpdatePostResponse } from "schema/api/manage/types"
import { zManageUpdatePostRequest } from "schema/api/manage/zod"
import { Core } from "../../../../core"
import { Responses } from "../../../../interfaces/response"
import { requireManageSpecificPermissionHandler } from "../../controller"

export const managePostApp = express.Router()

managePostApp.put("/posts/:post_id", requireManageSpecificPermissionHandler<ManageUpdatePostResponse>(AdminPermissionType.EditPost, async (req, args) => {
  const parsedId = PostIdSchema.safeParse(req.params.post_id)
  if (!parsedId.success) {
    return Responses.errorBadRequest(parsedId.error.issues)
  }
  const parsed = zManageUpdatePostRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  return await Core.postUseCase.updatePost(args, parsedId.data, parsed.data)
}))

managePostApp.delete("/posts/:post_id", requireManageSpecificPermissionHandler<ManageDeletePostResponse>(AdminPermissionType.DeletePost, async (req, args) => {
  const parsedId = PostIdSchema.safeParse(req.params.post_id)
  if (!parsedId.success) {
    return Responses.errorBadRequest(parsedId.error.issues)
  }
  return await Core.postUseCase.deletePost(args, parsedId.data)
}))
