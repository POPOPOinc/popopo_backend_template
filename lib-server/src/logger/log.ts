/* eslint-disable @typescript-eslint/no-explicit-any */
// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
import { basename } from "path"
import { type StaticStringLiteral } from "lib-common"
import { type ContextProvider, LoggerContextProvider } from "./context-provider"
import { maskSensitiveData } from "./mask"

type Severity = "ERROR" | "WARN" | "INFO" | "DEBUG"

type Options = {
  alert: boolean
  /** true にすると 外部通知（Slack 等）を抑制する */
  ignoreSlackReport: boolean
}

/**
 * notice オブジェクトを "key: value, key2: value2" 形式の文字列に変換する
 */
function formatNoticeForMessage(notice: object): string {
  const entries = Object.entries(notice)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return `${key}: "${value}"`
      }
      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`
      }
      return `${key}: ${value}`
    })
  return entries.join(", ")
}

function createLogger<T>(contextProvider: ContextProvider<T>) {
  function log(severity: Severity, logType: string, notice?: object, details?: object, options?: Partial<Options>): void {
    const context = contextProvider.getContext()
    const logInfo = context ? contextProvider.extractLogInfo(context) : undefined
    const maskedLogInfo = logInfo ? maskSensitiveData(logInfo) as typeof logInfo : undefined
    const logSerializer = process.env.NODE_ENV !== "production" ? require("json-colorizer").colorize : JSON.stringify
    const maskedDetails = details ? maskSensitiveData(details) : undefined
    const maskedNotice = notice ? maskSensitiveData(notice) : undefined

    // message は logType + notice の key:value 形式
    const message = maskedNotice && 0 < Object.keys(maskedNotice).length
      ? `${logType} -> ${formatNoticeForMessage(maskedNotice)}`
      : logType

    if (maskedLogInfo) {
      process.stderr.write(logSerializer({
        severity,
        message,
        logType,
        notice: maskedNotice,
        details: maskedDetails,
        ...maskedLogInfo,
        options
      }) + "\n")
    } else {
      process.stderr.write(logSerializer({ severity, message, logType, notice: maskedNotice, details: maskedDetails, options }) + "\n")
    }
  }

  return {
    log: <M extends string>(severity: Severity, logType: StaticStringLiteral<M>, notice?: object, details?: object, options?: Partial<Options>) => {
      log(severity, logType, notice, details, options)
    },
    debug: <M extends string>(logType: StaticStringLiteral<M>, notice?: object, details?: object, options?: Partial<Options>) => {
      log("DEBUG", logType, notice, details, options)
    },
    /**
     * @param logType - ログの種類（集計用の固定文字列）
     * @param notice - 通知で表示するサマリー情報。message に key:value 形式で追加される
     * @param details - ログに記録する詳細情報
     * @param options - オプション（alert: true で通知対象にする）
     */
    info: <M extends string>(logType: StaticStringLiteral<M>, notice?: object, details?: object, options?: Partial<Options>) => {
      log("INFO", logType, notice, details, options)
    },
    warn: <M extends string>(logType: StaticStringLiteral<M>, notice?: object, details?: object, options?: Partial<Options>) => {
      log("WARN", logType, notice, details, options)
    },
    /**
     * @param logType - ログの種類（集計用の固定文字列）
     * @param error - エラーオブジェクト
     * @param notice - 通知で表示するサマリー情報。message に key:value 形式で追加される
     * @param details - ログに記録する詳細情報
     * @param severity - ログの重要度（デフォルト: "ERROR"）
     */
    error: <M extends string>(logType: StaticStringLiteral<M>, error: any, notice?: object, details?: object, severity: Severity = "ERROR") => {
      // Firestore SDK が単一フィールドインデックス不足を空メッセージで返すため、
      // インデックス作成を促すメッセージに変更する
      // ref: https://github.com/googleapis/nodejs-firestore/issues/1866
      const actualLogType = (error instanceof Error && error.message === "9 FAILED_PRECONDITION: ")
        ? "Need to create Firestore index."
        : logType

      const trace = getTrace(error)
      log(severity, actualLogType, notice, {
        ...details,
        error: formatError(error),
        trace: {
          func: trace.stack.func,
          file: trace.stack.file,
          line: trace.stack.line,
          column: trace.stack.column
        },
        stackTraces: trace.stackTraces.map(callSite => {
          const func = callSite.getMethodName() || callSite.getFunctionName() || '<anonymous>'
          const file = callSite.getFileName() ? basename(callSite.getFileName() as string) : '<unknown>'
          const line = callSite.getLineNumber()
          const column = callSite.getColumnNumber()
          return `${func} (${file}:${line}:${column})`
        })
      })
    },
    fatal: <M extends string>(logType: StaticStringLiteral<M>, notice?: object, details?: object, options?: Partial<Options>): never => {
      log("ERROR", logType, notice, details, options)
      process.exit(-1)
    }
  }
}

export const logger = createLogger(new LoggerContextProvider())

function isPlainObject(value: any): value is Record<string, any> {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function formatError(error: any): any {
  if (error instanceof Error) {
    return toJSON(error)
  } else if (isScalar(error)) {
    return error
  } else if (isPlainObject(error)) {
    return error
  } else {
    try {
      return JSON.stringify(error)
    } catch {
      return null
    }
  }
}

const backtrace = /^\s+at(?:\s+async)?\s+(?:(.*?)\s+\((.*)\)|(.*))/gm

const ignoreLibs = [
  "node:internal",
  "express",
  "@grpc/grpc-js",
  "google-gax",
  "@google-cloud",
]

const errorProperties = ["code", "name", "message"]

function toJSON(src: Error): any {
  const out = {} as any
  for (const key of errorProperties) {
    const val = (src as any)[key]
    if (typeof val === "string") {
      out[key] = val
    }
  }
  if (out.name === "Error") {
    out.name = src.constructor.name
  }
  if (src.stack !== undefined) {
    out.stack = []
    for (const [_0, name, uri1, uri2] of src.stack.matchAll(backtrace)) {
      const file = (uri1 ?? uri2).replace(/^(file:|.*\/node_modules)\/+/, "")
      if (!ignoreLibs.find(lib => file.startsWith(`${lib}/`))) {
        if (name && name !== "<anonymous>") {
          out.stack.push(`${name} (${file})`)
        } else {
          out.stack.push(file)
        }
      }
    }
    if (out.stack.length === 0) {
      out.stack.push("stack is reduced due to ignored libraries")
    }
  }
  if (src.cause && typeof src.cause === "object") {
    if (src.cause instanceof Error) {
      out.cause = toJSON(src.cause)
    } else {
      assign(out, src.cause)
    }
  }
  assign(out, src)
  return out
}

function assign(out: any, src: object) {
  for (const [key, val] of Object.entries(src)) {
    if (isScalar(val)) {
      out[key] ||= val
    }
  }
}

const DEFAULT_LOGGER_JS_PATH = "lib-server/src/logger/log.ts"
function prepareStackTrace(_error: Error, stackTraces: NodeJS.CallSite[]) {
  const trace =
      stackTraces.find(x =>
        !x.getFileName()?.endsWith(DEFAULT_LOGGER_JS_PATH),
      ) ?? stackTraces[0];
  if (!trace) {
    return {
      func: '<anonymous>',
      file: '<unknown>',
      line: 0,
      column: 0,
    };
  }

  return {
    func: trace.getMethodName() || trace.getFunctionName() || '<anonymous>',
    file: basename(trace.getFileName() as string),
    line: trace.getLineNumber(),
    column: trace.getColumnNumber(),
  };
}


function getTrace(caller?: Function) {
  const original = Error.prepareStackTrace;
  const error = { stack: { func: '', file: '', line: 0, column: 0 } };
  let stackTraces: NodeJS.CallSite[] = [];

  Error.prepareStackTrace = (error, traces) => {
    stackTraces = traces;
    return prepareStackTrace(error, traces);
  };

  Error.captureStackTrace(error, caller || getTrace);
  const stack = error.stack;
  Error.prepareStackTrace = original;

  return { stack, stackTraces };
}

function isScalar(src: any) {
  switch (typeof src) {
    case "bigint":
    case "boolean":
    case "number":
    case "string":
    case "symbol":
      return true
    default:
      return false
  }
}
