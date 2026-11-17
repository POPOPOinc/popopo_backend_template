// web（SSR / SPA）と .well-known の生成が対応する言語。先頭が既定の言語
export type Locale = "ja" | "en"

export const locales: Locale[] = ["ja", "en"]

export type RouteDefinition<Params extends Record<string, unknown> = Record<string, never>> = {
  pattern: string
  params?: { [K in keyof Params]: (s: string) => Params[K] }
  needsSSR: boolean
  supportsRedirect?: boolean
}
