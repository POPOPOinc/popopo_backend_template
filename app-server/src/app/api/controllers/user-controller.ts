import express from "express"
import { UserId } from "schema"
import type { RegisterUserResponse, UpdateUserResponse } from "schema/api/app/types"
import { zRegisterUserRequest, zUpdateUserRequest } from "schema/api/app/zod"
import { Core } from "../../../core"
import { Responses } from "../../../interfaces/response"
import { requireFirebaseLoginHandler, requireServiceLoginHandler } from "../controller"

export const userApp = express.Router()

userApp.post("/users/me", requireFirebaseLoginHandler<RegisterUserResponse>("service", async (req, args) => {
  const parsed = zRegisterUserRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  return await Core.userUseCase.registerUser(UserId(args.firebase.uid), parsed.data)
}))

userApp.put("/users/me", requireServiceLoginHandler<UpdateUserResponse>(async (req, args) => {
  const parsed = zUpdateUserRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  return await Core.userUseCase.updateUser(args.user, parsed.data)
}))
