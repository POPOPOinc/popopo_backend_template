import type { Request, Response, NextFunction } from "express"
import { randomUUID } from "crypto"
import { normalizeTraceId, runWithRequestContext } from "../logger/logger-context";

function getRequestId(req: Request): string {
  const requestId = req.headers['x-cloud-trace-context'];
  if (typeof requestId === 'string') {
    const regex = /^([^/]+)/;
    const result = requestId.match(regex);
    if (result && 1 < result.length) {
      return normalizeTraceId(result[1]);
    }
  }
  return normalizeTraceId(randomUUID());
}

function getClientIp(req: Request): string | undefined {
  return (
    req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.get("x-real-ip") ||
    req.get("x-client-ip") ||
    req.socket?.remoteAddress
  )
}

function getServerIp(req: Request): string | undefined {
  return req.get("x-forwarded-for")?.split(",")[1]?.trim()
}

function getXRequestedWith(req: Request): string | undefined {
  return req.get("x-requested-with")
}

export function createRequestContextMiddleware(projectId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = getRequestId(req);
    const clientIp = getClientIp(req)
    const xRequestedWith = getXRequestedWith(req)

    req.context = {
      requestId,
      httpRequest: {
        requestMethod: req.method,
        requestUrl: `${req.headers['x-forwarded-proto'] as string}://${req.headers['host']}${req.originalUrl}`,
        status: res.statusCode,
        protocol: req.protocol.toUpperCase() + '/' + req.httpVersion,
        referer: req.get("referer"),
        userAgent: req.get("user-agent"),
        remoteIp: clientIp,
        serverIp: getServerIp(req)
      },
      xRequestedWith,
      traceId: `projects/${projectId}/traces/${requestId}`
    }

    runWithRequestContext(req.context, () => {
      next()
    })
  }
}
