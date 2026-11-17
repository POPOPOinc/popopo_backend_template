import { useLocation, useNavigate } from "react-router"
import { PagePosition } from "../firestore-access"

/**
 * クエリパラメータベースでページングをするためのフック
 */
export const usePagingQuery = (options: { initialPageSize: number; maxPageSize?: number }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)

  // クエリパラメータでページングサイズを変更できるようにする要件は存在しないが、
  // 気軽に1件ページングに変更できないとデバッグが難しいので実装してある
  const maxPageSize = options.maxPageSize ?? Math.max(options.initialPageSize, 200)
  const queryBasedPageSize = Math.floor(Number(query.get("pageSize")))

  const pagePosition: PagePosition = {
    pageSize: Math.max(0, Math.min(queryBasedPageSize, maxPageSize)) || options.initialPageSize,
    until: query.get("until") ?? undefined,
    start: query.get("start") ?? undefined,
  }

  const generateQuery = (nextPagePosition: Partial<PagePosition>) => {
    const merged = { ...pagePosition, ...nextPagePosition }
    const nextParams = new URLSearchParams()
    if (merged.until) nextParams.set("until", merged.until)
    if (merged.start) nextParams.set("start", merged.start)
    if (merged.pageSize) nextParams.set("pageSize", merged.pageSize.toString())
    if (nextPagePosition.start) nextParams.delete("until")
    if (nextPagePosition.until) nextParams.delete("start")
    return nextParams
  }

  return {
    pagePosition,
    generateQuery,
    navigatePage: (nextPagePosition: Partial<PagePosition>) => {
      void navigate(location.pathname + "?" + generateQuery(nextPagePosition).toString())
    },
  }
}
