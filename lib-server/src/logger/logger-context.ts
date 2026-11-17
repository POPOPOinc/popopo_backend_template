/// <reference path="../../types/express.d.ts" />
import { randomBytes } from "crypto"
import type { Request } from "express"
import { AdminDocument, UserDocument } from "schema"
import { ContextManager } from "./context-manager"
import { SupportedContext } from "./context-provider"


const loggerContextManager = new ContextManager<SupportedContext>()

export function runWithRequestContext<R>(context: SupportedContext, fn: () => R): R {
  return loggerContextManager.run(context, fn)
}

export function runWithLoggerContext<R>(context: SupportedContext, fn: () => R): R {
  return loggerContextManager.run<R>(context, fn)
}

export function getLoggerContext(): SupportedContext | undefined {
  return loggerContextManager.getContext()
}

export function updateContextWithUser(
  req: Request,
  userType: "service" | "manage",
  userId: string,
  userData?: UserDocument | AdminDocument
) {
  if (req.context) {
    req.context.user = {
      type: userType,
      id: userId,
      data: userData
    }
  }
}

export function normalizeTraceId(rawTraceId: string): string {
  const normalized = rawTraceId.toLowerCase().replace(/[^0-9a-f]/g, "")
  if (normalized.length === 32) {
    return normalized
  }
  if (32 <normalized.length) {
    return normalized.slice(0, 32)
  }
  return randomBytes(16).toString("hex")
}
