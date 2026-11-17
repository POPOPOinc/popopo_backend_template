import fs from "fs"
import path from "path"

/**
 * infra/conf/*.encrypted.json の sops バージョンが
 * .github/actions/setup-sops/action.yml の SOPS_VERSION と一致するか検証する。
 */
export function checkSopsVersion(repoRoot) {
  const actionFile = path.join(repoRoot, ".github", "actions", "setup-sops", "action.yml")
  const confDir = path.join(repoRoot, "infra", "conf")

  // setup-sops の SOPS_VERSION から期待バージョンを取得
  const versionMatch = fs.readFileSync(actionFile, "utf-8").match(/SOPS_VERSION:\s*([0-9.]+)/)
  if (!versionMatch) {
    return [{ file: path.relative(repoRoot, actionFile), message: "SOPS_VERSION が見つかりません" }]
  }
  const expected = versionMatch[1]

  // 暗号化ファイルを走査
  const files = fs.readdirSync(confDir).filter((f) => f.endsWith(".encrypted.json"))
  const errors = []

  for (const file of files) {
    const filePath = path.join(confDir, file)
    const content = fs.readFileSync(filePath, "utf-8")
    const match = content.match(/"version":\s*"(.+?)"/)
    const actual = match ? match[1] : null

    if (actual !== expected) {
      errors.push({
        file: path.relative(repoRoot, filePath),
        message: `sops version mismatch: expected ${expected}, got ${actual}`,
      })
    }
  }

  return errors
}
