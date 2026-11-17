import { getBaseTemplate, injectHead } from "../lib/ssr"
import { PageContext, PageResponse } from "../lib/types"

/** SPA のページ。メタタグだけを差し込んだテンプレートを返し、描画はブラウザ側の React に任せる */
export function renderSpa(ctx: PageContext): Promise<PageResponse> {
  const html = injectHead(getBaseTemplate(), {
    title: "Web Template",
    description: "Firebase ベースの Web テンプレートです。",
    url: ctx.url,
  }, ctx)
  return Promise.resolve({ status: 200, html })
}
