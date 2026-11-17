import { PostId, UserId } from "../id"
import { RouteDefinition } from "./types"

// web の SPA（react-router）と SSR（web/functions の renderHTML）が共有するルート定義
export const publicRouteDefinitions = {
  top: {
    pattern: "/",
    needsSSR: false,
  } satisfies RouteDefinition,

  users: {
    user: {
      pattern: "/users/:userId",
      params: { userId: UserId },
      needsSSR: true,
      supportsRedirect: true,
    } satisfies RouteDefinition<{ userId: UserId }>,
  },

  posts: {
    post: {
      pattern: "/posts/:postId",
      params: { postId: PostId },
      needsSSR: true,
      supportsRedirect: true,
    } satisfies RouteDefinition<{ postId: PostId }>,
  },
}
