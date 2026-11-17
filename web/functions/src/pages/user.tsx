import { UserView } from "lib-react/pages"
import { renderToString } from "react-dom/server"
import { FirestorePaths, UserDocuments, UserId } from "schema"
import { renderNotFoundPage } from "../lib/simplePageSsr"
import { getBaseTemplate, injectHead } from "../lib/ssr"
import { PageContext, PageResponse, RouteParams } from "../lib/types"

/** /{lang}/users/{userId}: Firestore からユーザーを読み、OGP 付きの HTML を返す */
export async function renderUser(ctx: PageContext, params: RouteParams): Promise<PageResponse> {
  const userId = UserId(params.userId ?? "")
  const snapshot = await ctx.firestore.doc(FirestorePaths.Users.getDocPath(userId)).get()
  const user = UserDocuments.fromDocumentSnapshot(snapshot)
  if (!user || user.status === "banned") {
    return renderNotFoundPage(ctx)
  }
  const body = renderToString(<UserView displayName={user.display_name} createdAt={user.created_at} />)
  const html = injectHead(getBaseTemplate(), {
    title: `${user.display_name} さん`,
    description: `${user.display_name} さんのプロフィール`,
    url: ctx.url,
  }, ctx, body)
  return {
    status: 200,
    html,
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  }
}
