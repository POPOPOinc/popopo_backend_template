import { PostView } from "lib-react/pages"
import { renderToString } from "react-dom/server"
import { FirestorePaths, PostDocuments, PostId } from "schema"
import { renderNotFoundPage } from "../lib/simplePageSsr"
import { getBaseTemplate, injectHead } from "../lib/ssr"
import { PageContext, PageResponse, RouteParams } from "../lib/types"

/** /posts/{postId}: Firestore から投稿を読み、OGP 付きの HTML を返す */
export async function renderPost(ctx: PageContext, params: RouteParams): Promise<PageResponse> {
  const postId = PostId(params.postId ?? "")
  const snapshot = await ctx.firestore.doc(FirestorePaths.Posts.getDocPath(postId)).get()
  const post = PostDocuments.fromDocumentSnapshot(snapshot)
  if (!post || !post.display_period_state.active) {
    return renderNotFoundPage(ctx)
  }
  const body = renderToString(<PostView authorName={post.author.display_name} body={post.body} createdAt={post.created_at} />)
  const html = injectHead(getBaseTemplate(), {
    title: `${post.author.display_name} さんの投稿`,
    description: post.body.slice(0, 120),
    url: ctx.url,
  }, ctx, body)
  return {
    status: 200,
    html,
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
  }
}
