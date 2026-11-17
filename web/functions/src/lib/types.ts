import { Firestore } from "firebase-admin/firestore"

export type Lang = {
  lang: string
}

export type PageContext = {
  locale: string
  path: string
  url: string
  siteUrl: string
  langs: Lang[]
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | undefined>
  firestore: Firestore
}

export type PageResponse = {
  status: number
  html: string | Buffer
  headers?: Record<string, string>
}

export type RouteParams = Record<string, string>

export type Route = {
  regex: RegExp
  handler(ctx: PageContext, params: RouteParams): Promise<PageResponse>
  extract: (match: RegExpExecArray) => RouteParams
}
