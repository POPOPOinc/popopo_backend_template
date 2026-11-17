import { readFileSync } from "fs"
import { join } from "path"
import { PageContext } from "./types"

let baseTemplate: string | null = null

/** Vite がビルドした index.html（scripts/prepare-ssr-template.cjs で functions/templates にコピー）を SSR のテンプレートにする */
export function getBaseTemplate(): string {
  if (!baseTemplate) {
    baseTemplate = readFileSync(join(__dirname, "../templates/index.html"), "utf-8")
  }
  return baseTemplate
}

export type MetaTags = {
  title: string
  description: string
  imageUrl?: string
  url: string
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** OGP・Twitter Card・hreflang・canonical を組み立てる。GTM は環境変数 GTM_CONTAINER_ID があるときだけ入れる */
function buildHead(meta: MetaTags, ctx: PageContext): string {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const localePrefix = new RegExp(`^/(${ctx.langs.map(l => l.lang).join("|")})/`)
  const pathWithoutLocale = ctx.path.replace(localePrefix, "/")
  const gtmId = process.env.GTM_CONTAINER_ID
  return `
  ${gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>` : ""}
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${meta.imageUrl ? `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">` : ""}
  <meta property="og:url" content="${escapeHtml(meta.url)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${ctx.langs.map(l => `<link rel="alternate" hreflang="${l.lang}" href="${ctx.siteUrl}/${l.lang}${pathWithoutLocale}">`).join("\n  ")}
  <link rel="alternate" hreflang="x-default" href="${ctx.siteUrl}${pathWithoutLocale}">
  <link rel="canonical" href="${escapeHtml(meta.url)}">`
}

/** テンプレートの既存メタタグを除去してページ固有のものに差し替え、body を描画済み HTML で埋める */
export function injectHead(template: string, meta: MetaTags, ctx: PageContext, bodyHtml?: string): string {
  let html = template
  html = html.replace(/<title>[^<]*<\/title>/i, "")
  html = html.replace(/<meta\s+(property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>/gi, "")
  html = html.replace(/<link\s+rel="(canonical|alternate)"[^>]*>/gi, "")
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${ctx.locale}"`)
  html = html.replace(/<head>/, `<head>${buildHead(meta, ctx)}`)
  if (bodyHtml !== undefined) {
    html = html.replace(/<div id="screen"><\/div>/, `<div id="screen">${bodyHtml}</div>`)
  }
  return html
}
