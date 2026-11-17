import { z } from "zod/v4"

export const CreatedAt = z.number().describe("作成日時 (UNIX Timestamp mills)")
export const UpdatedAt = z.number().describe("更新日時 (UNIX Timestamp mills)")

export const MigrationDocumentBody = z.object({
  git_hash: z.string().optional().describe("この migration が適用された時の git のハッシュ"),
  created_at: CreatedAt,
  updated_at: UpdatedAt,
})

export type MigrationDocumentBody = z.infer<typeof MigrationDocumentBody>
