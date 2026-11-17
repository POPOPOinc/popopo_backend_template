/// <reference path="../../types/express.d.ts" />
import type { Request } from "express"
import {
  getLoggerContext,
} from "./logger-context"

export interface ContextProvider<T> {
  getContext(): T | undefined
  extractLogInfo(context: T): LogContextInfo | undefined
}

export type DaemonLoggerContext = {
  requestId: string
  traceId: string
  daemon: {
    name: string
  }
}

export interface MessageBrokerLoggerContext {
  jobId: string
  messageId: string
  documentPath?: string
  timestamp: number
  traceId: string
}

interface LogContextInfo {
  context: Omit<SupportedContext, "traceId">
  'logging.googleapis.com/trace': string
}

export type SupportedContext = DaemonLoggerContext | MessageBrokerLoggerContext | Request["context"]

export class LoggerContextProvider implements ContextProvider<SupportedContext> {
  getContext(): SupportedContext | undefined {
    return getLoggerContext()
  }

  extractLogInfo(context: SupportedContext): LogContextInfo | undefined {
    if (context) {
      const { traceId, ...rest } = context
      return {
        context: rest,
        'logging.googleapis.com/trace': traceId,
      }
    }
    return undefined
  }
}
