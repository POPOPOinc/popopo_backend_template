import express from "express"
import type { DebugUpdateMyStatusResponse } from "schema/api/debug/types"
import { zDebugUpdateMyStatusRequest } from "schema/api/debug/zod"
import { Core } from "../../../core"
import { Responses } from "../../../interfaces/response"
import { handle, requireServiceLoginHandler } from "../controller"

/** 本番以外でだけ mount される（app/api/main.ts） */
export const debugApp = express.Router()

debugApp.post("/debug/error", handle(async (req) => {
  throw new Error(`/debug/error API called! Your IP: ${req.ip}`)
}))

debugApp.put("/debug/users/me/status", requireServiceLoginHandler<DebugUpdateMyStatusResponse>(async (req, args) => {
  const parsed = zDebugUpdateMyStatusRequest.safeParse(req.body)
  if (!parsed.success) {
    return Responses.errorBadRequest(parsed.error.issues)
  }
  return await Core.userUseCase.updateStatusForDebug(args.user, parsed.data.status)
}))
