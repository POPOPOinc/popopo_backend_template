import express from "express"
import { AdminPermissionType, UserIdSchema } from "schema"
import type { ManageGetUserAuthResponse, ManageUpdateUserResponse } from "schema/api/manage/types"
import { zManageUpdateUserRequest } from "schema/api/manage/zod"
import { Core } from "../../../../core"
import { Responses } from "../../../../interfaces/response"
import { requireManageSpecificPermissionHandler } from "../../controller"

export const manageUserApp = express.Router()

manageUserApp.put("/users/:user_id", requireManageSpecificPermissionHandler<ManageUpdateUserResponse>(AdminPermissionType.EditUser, async (req, args) => {
  const parsed = zManageUpdateUserRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  const parsedId = UserIdSchema.safeParse(req.params.user_id)
  if (!parsedId.success) {
    return Responses.errorBadRequest(parsedId.error.issues)
  }
  return await Core.userManagementUseCase.updateUser(args, parsedId.data, parsed.data)
}))

/** Firebase Auth のアカウント情報は Firestore に無いため、manage からも API で取得する */
manageUserApp.get("/users/:user_id/auth", requireManageSpecificPermissionHandler<ManageGetUserAuthResponse>(AdminPermissionType.EditUser, async (req) => {
  const parsedId = UserIdSchema.safeParse(req.params.user_id)
  if (!parsedId.success) {
    return Responses.errorBadRequest(parsedId.error.issues)
  }
  return await Core.userManagementUseCase.getUserAuth(parsedId.data)
}))
