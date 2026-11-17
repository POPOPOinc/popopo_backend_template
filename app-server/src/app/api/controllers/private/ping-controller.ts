import express from "express"
import type { PrivatePingResponse } from "schema/api/private/types"
import { Responses } from "../../../../interfaces/response"
import { handle } from "../../controller"
import { resolveRemoteAddress } from "./index"

export const privatePing = express.Router()

privatePing.get("/ping", handle(async (req) => {
  const remoteAddress = resolveRemoteAddress(req)
  return Responses.successOK({
    message: "pong",
    remote_address: remoteAddress ?? "",
  } satisfies PrivatePingResponse)
}))
