import { readdirSync } from "fs"
import { Migration } from "#core/dsl"
import { migrate } from "#core/engine"

let { pathname: migrationsPath } = new URL("./../migrations", import.meta.url)

if (process.platform === "win32") {
  // See: https://github.com/nodejs/node/issues/37845
  // ビルド済みのモジュールで実行するとエラーになるが、本番では Windows は使わないので
  migrationsPath = "migrations"
}

const migrations: Record<string, Migration> = {}
for (const e of readdirSync(migrationsPath)) {
  const module = await import(`${migrationsPath}/${e}`)
  for (const key in module) {
    const migration = module[key]
    if (migration instanceof Migration) {
      if (key in migrations) {
        throw Error(`Migration name conflict: ${key}`)
      }
      migrations[key] = migration
    }
  }
}

migrate(migrations).catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
