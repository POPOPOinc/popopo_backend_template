import { NotFoundPage, ServerErrorPage, getMessages } from "lib-react/simple-pages"
import { renderToString } from "react-dom/server"
import { mainCssPath } from "../generated/css-paths"
import { PageContext, PageResponse } from "./types"

const cssPath: string = mainCssPath

/** エラーページはテンプレート（SPA のバンドル）を使わず、CSS だけを読み込む素の HTML にする */
function wrapInHtmlDocument(content: string, title: string, locale: string): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${cssPath ? `<link rel="stylesheet" href="${cssPath}">` : ""}
</head>
<body>
  ${content}
</body>
</html>`
}

export function renderNotFoundPage(ctx: PageContext): PageResponse {
  const content = renderToString(<NotFoundPage locale={ctx.locale} homeUrl={`${ctx.siteUrl}/`} />)
  return { status: 404, html: wrapInHtmlDocument(content, getMessages(ctx.locale).notFound.title, ctx.locale) }
}

export function renderServerErrorPage(ctx: PageContext): PageResponse {
  const content = renderToString(<ServerErrorPage locale={ctx.locale} homeUrl={`${ctx.siteUrl}/`} />)
  return { status: 500, html: wrapInHtmlDocument(content, getMessages(ctx.locale).serverError.title, ctx.locale) }
}
