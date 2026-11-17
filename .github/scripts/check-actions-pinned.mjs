// workflow と composite action の uses: が full commit SHA（40 桁）で pin され、`# vX.Y.Z` のコメントが付いているかを確認する
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const files = [
  ...readdirSync(".github/workflows").filter((f) => /\.ya?ml$/.test(f)).map((f) => join(".github/workflows", f)),
  ...readdirSync(".github/actions", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(".github/actions", d.name, "action.yml")),
]

const usesPattern = /^\s*(?:-\s+)?uses:\s*["']?([^\s"'#]+)["']?\s*(#.*)?$/
const pinnedPattern = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/
const versionCommentPattern = /^#\s*v\d+(\.\d+){0,2}\b/

const errors = []
for (const file of files) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const m = usesPattern.exec(line)
    if (!m) return
    const [, ref, comment] = m
    if (ref.startsWith("./")) return
    if (ref.startsWith("docker://") && /@sha256:[0-9a-f]{64}$/.test(ref)) return
    if (!pinnedPattern.test(ref)) {
      errors.push(`${file}:${i + 1}: full commit SHA で pin されていません: ${ref}`)
    } else if (!comment || !versionCommentPattern.test(comment)) {
      errors.push(`${file}:${i + 1}: バージョンのコメント（# vX.Y.Z）がありません: ${ref}`)
    }
  })
}

if (errors.length > 0) {
  for (const e of errors) console.error(e)
  process.exit(1)
}
console.log(`${files.length} files checked: all actions are pinned to full commit SHA.`)
