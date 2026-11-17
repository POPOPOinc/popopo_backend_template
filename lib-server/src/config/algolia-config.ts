import { z } from "zod/v4"

export const AlgoliaConfig = z.object({
  appId: z.string(),
  "apiKey!": z.string(),
  /** 接続先ホストの上書き（統合テストで fake server に向けるときだけ使う。例: "127.0.0.1:4090"） */
  host: z.string().optional(),
})

export type AlgoliaConfig = z.infer<typeof AlgoliaConfig>
