import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { onRequest, Request } from "firebase-functions/v2/https"
import { logger } from "firebase-functions/v2"
import { renderNotFoundPage, renderServerErrorPage } from "./lib/simplePageSsr"
import { renderSpa } from "./pages/spa"
import { Lang, PageContext, PageResponse, Route } from "./lib/types"
import { renderPost } from "./pages/post"
import { renderUser } from "./pages/user"
import { detectPreferredLang } from "./lib/locale"
import { buildPath, locales, patternToRegex, publicRouteDefinitions as r } from "schema"

initializeApp()

const langs: Lang[] = locales.map(lang => ({ lang }))
const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join("|")})(?=/|$)`)
const siteUrl = (process.env.SITE_URL ?? "http://127.0.0.1:5002").replace(/\/$/, "")

/**
 * Accept-Language ヘッダーから言語を決め、/{lang}{locationPath} へリダイレクトする
 */
function redirectByAcceptLanguage(ctx: PageContext, locationPath: string): PageResponse {
  const acceptLanguage = ctx.headers["accept-language"]
  const lang = detectPreferredLang(typeof acceptLanguage === "string" ? acceptLanguage : undefined)
  return {
    status: 302,
    headers: {
      "Location": `/${lang}${locationPath}`,
      "Vary": "Accept-Language",
      "Cache-Control": "private, no-store",
    },
    html: "",
  }
}

/** schema の publicRouteDefinitions（SPA と共有）から作るルート。needsSSR: true のルートには SSR のハンドラを付ける */
const routes: Route[] = [
  // Top（SSR 不要。SPA の index.html を返す）
  { regex: patternToRegex(r.top.pattern), handler: renderSpa, extract: () => ({}) },
  { regex: new RegExp(`^/(${locales.join("|")})/?$`), handler: renderSpa, extract: () => ({}) },

  // 言語つきのルート（SSR）
  {
    regex: patternToRegex(r.users.user.pattern, { withLocale: true }),
    handler: renderUser,
    extract: m => ({ userId: decodeURIComponent(m[2] ?? "") }),
  },
  {
    regex: patternToRegex(r.posts.post.pattern, { withLocale: true }),
    handler: renderPost,
    extract: m => ({ postId: decodeURIComponent(m[2] ?? "") }),
  },

  // 言語なしのルート（supportsRedirect: true）。Accept-Language で /{lang} つきへリダイレクトする
  {
    regex: patternToRegex(r.users.user.pattern),
    handler: (ctx, params) => Promise.resolve(redirectByAcceptLanguage(ctx, buildPath(r.users.user.pattern, params))),
    extract: m => ({ userId: decodeURIComponent(m[1] ?? "") }),
  },
  {
    regex: patternToRegex(r.posts.post.pattern),
    handler: (ctx, params) => Promise.resolve(redirectByAcceptLanguage(ctx, buildPath(r.posts.post.pattern, params))),
    extract: m => ({ postId: decodeURIComponent(m[1] ?? "") }),
  },
]

function makeContext(req: Request): PageContext {
  const path = req.path
  const localeMatch = LOCALE_PREFIX_RE.exec(path)
  const query: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string") {
      query[key] = value
    }
  }
  return {
    locale: localeMatch?.[1] ?? locales[0] ?? "ja",
    path,
    url: `${siteUrl}${path}`,
    siteUrl,
    langs,
    headers: req.headers,
    query,
    firestore: getFirestore(),
  }
}

export const renderHTML = onRequest({
  region: "asia-northeast1",
  invoker: "public",
}, async (req, res) => {
  function sendResponse(response: PageResponse): void {
    for (const [key, value] of Object.entries(response.headers ?? {})) {
      res.set(key, value)
    }
    res.status(response.status).send(response.html)
  }

  const ctx = makeContext(req)
  try {
    for (const route of routes) {
      const match = route.regex.exec(ctx.path)
      if (match) {
        return sendResponse(await route.handler(ctx, route.extract(match)))
      }
    }
    return sendResponse(renderNotFoundPage(ctx))
  } catch (cause) {
    logger.error("SSR に失敗しました", { path: ctx.path, cause })
    return sendResponse(renderServerErrorPage(ctx))
  }
})
