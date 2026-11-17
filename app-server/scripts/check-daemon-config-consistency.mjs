#!/usr/bin/env node
// daemon / job のコントローラーファイルと、main.ts の定義（daemonDefinitions / jobDefinitions）が一致しているか確認する。
// コントローラーを追加したのに定義へ登録し忘れる、またはその逆を CI で検出する。
// あわせて、daemonDefinitions と、デプロイする daemon の一覧（infra/deploy/app-server/daemons.txt）が一致しているかも確認する。
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const toCamel = name => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

function controllerNames(dir) {
  return readdirSync(join(root, dir))
    .filter(f => f.endsWith(".ts"))
    .map(f => toCamel(f.replace(/\.ts$/, "")))
    .sort()
}

function definitionNames(file, variable) {
  const source = readFileSync(join(root, file), "utf8")
  const match = source.match(new RegExp(`export const ${variable}[^=]*= \\{([\\s\\S]*?)\\n\\}`))
  if (!match) {
    throw new Error(`${variable} が ${file} に見つかりません`)
  }
  return [...match[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*[,:]/gm)].map(m => m[1]).sort()
}

const targets = [
  { kind: "daemon", controllers: "src/app/daemon/controllers", main: "src/app/daemon/main.ts", variable: "daemonDefinitions" },
  { kind: "job", controllers: "src/app/job/controllers", main: "src/app/job/main.ts", variable: "jobDefinitions" },
]

let failed = false
for (const t of targets) {
  const controllers = controllerNames(t.controllers)
  const definitions = definitionNames(t.main, t.variable)
  const missingInDefinitions = controllers.filter(c => !definitions.includes(c))
  const missingControllers = definitions.filter(d => !controllers.includes(d))
  if (0 < missingInDefinitions.length) {
    console.error(`[${t.kind}] ${t.variable} に登録されていないコントローラー: ${missingInDefinitions.join(", ")}`)
    failed = true
  }
  if (0 < missingControllers.length) {
    console.error(`[${t.kind}] コントローラーファイルが存在しない定義: ${missingControllers.join(", ")}`)
    failed = true
  }
}

// デプロイしない daemon（理由をコメントで書く）
const DAEMON_EXCLUSIONS_FROM_DEPLOY = new Set([
  // 書き方の例で、何も処理しない
  "example",
])

const deployedDaemons = readFileSync(join(root, "../infra/deploy/app-server/daemons.txt"), "utf8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line !== "" && !line.startsWith("#"))
  .map(line => line.split(/\s+/)[0])
  .sort()
const daemons = definitionNames("src/app/daemon/main.ts", "daemonDefinitions")
const notDeployed = daemons.filter(d => !DAEMON_EXCLUSIONS_FROM_DEPLOY.has(d) && !deployedDaemons.includes(d))
const unknownDeployed = deployedDaemons.filter(d => !daemons.includes(d))
const excludedButDeployed = deployedDaemons.filter(d => DAEMON_EXCLUSIONS_FROM_DEPLOY.has(d))
if (0 < notDeployed.length) {
  console.error(`[daemon] daemons.txt に書かれていない daemon: ${notDeployed.join(", ")}`)
  failed = true
}
if (0 < unknownDeployed.length) {
  console.error(`[daemon] daemons.txt にあるが daemonDefinitions にない daemon: ${unknownDeployed.join(", ")}`)
  failed = true
}
if (0 < excludedButDeployed.length) {
  console.error(`[daemon] デプロイしない daemon が daemons.txt にある: ${excludedButDeployed.join(", ")}`)
  failed = true
}

if (failed) {
  process.exit(1)
}
console.log("daemon / job の定義とコントローラー、daemons.txt は一致しています")
