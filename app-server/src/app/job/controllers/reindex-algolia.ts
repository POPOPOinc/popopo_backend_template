import { logger } from "lib-server"
import { Core } from "../../../core"
import { JobDefinition } from "../interface"

/** Firestore の users を全件 Algolia に再登録するバッチ */
export const reindexAlgolia: JobDefinition = {
  handler: async () => {
    let cursor: string | undefined
    let count = 0
    do {
      const page = await Core.firestoreAccess.user.walkUsers(null, { limit: 500, cursor })
      await Core.algolia.saveUsers(page.items)
      count += page.items.length
      cursor = page.nextCursor
    } while (cursor)
    logger.info("Algolia への再登録が完了しました", { count })
  },
}
