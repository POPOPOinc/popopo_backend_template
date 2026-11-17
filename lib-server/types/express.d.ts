import type { UserDocument, AdminDocument } from "schema"

type RequestContext = {
  requestId: string
  httpRequest: {
    requestMethod: string
    requestUrl: string
    protocol: string
    referer?: string
    status: number
    userAgent?: string
    remoteIp?: string
    serverIp?: string
  }
  user?: {
    type: "service" | "manage"
    id: string
    data?: UserDocument | AdminDocument
  }
  xRequestedWith?: string
  appCheckResult?: "no-token" | "success" | "failure" | "skipped"
  traceId: string
}
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext
    }
  }
}

export {}
