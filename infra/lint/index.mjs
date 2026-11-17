import path from "path"
import { fileURLToPath } from "url"
import { checkSopsVersion } from "./rules/sops-version.mjs"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

const rules = [
  { name: "sops-version", fn: () => checkSopsVersion(repoRoot) },
]

let hasError = false

for (const rule of rules) {
  const errors = rule.fn()
  for (const err of errors) {
    console.error(`[${rule.name}] ${err.file}: ${err.message}`)
    hasError = true
  }
}

if (hasError) {
  process.exit(1)
}
