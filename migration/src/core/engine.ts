import { firestore } from "#config"
import { Migration } from "#core/dsl"
import { migrations } from "#firestore/schema"
import { exec } from "child_process"
import { Firestore } from "firebase-admin/firestore"
import { promisify } from "util"

class JobEdge {

  readonly sources = new Set<JobEdge>
  readonly targets = new Set<JobEdge>

  constructor(readonly key: string, readonly migration: Migration) {
  }

  async run(firestore: Firestore) {
    const gitHash = await getGitHash()
    const newRef = migrations.doc(this.key)

    const body = this.migration.body
    if (body.kind === "txn") {
      await firestore.runTransaction(async tx => {
        const newSnap = await tx.get(newRef)
        if (newSnap.exists) {
          console.info(`[${this.key}] Already applied.`)
          return
        }
        console.info(`[${this.key}] Start applying migration.`)
        let done = false
        try {
          await body.run(tx)
          const now = Date.now()
          tx.create(newRef, {
            git_hash: gitHash,
            created_at: now,
            updated_at: now,
          })
          done = true
          console.info(`[${this.key}] Just applied!`)
        } finally {
          if (!done) {
            console.warn(`[${this.key}] Aborted?`)
          }
        }
      })
      return
    }

    // batched migration: 本体はトランザクションの外で走らせ、完了マーカーのみ別 tx で書く
    const skip = await firestore.runTransaction(async tx => {
      const newSnap = await tx.get(newRef)
      if (newSnap.exists) {
        console.info(`[${this.key}] Already applied.`)
        return true
      }
      return false
    })
    if (skip) return

    console.info(`[${this.key}] Start applying batched migration.`)
    await body.run(firestore)
    await firestore.runTransaction(async tx => {
      // 競合や再実行に備え、書き込み直前に再チェックする
      const newSnap = await tx.get(newRef)
      if (newSnap.exists) return
      const now = Date.now()
      tx.create(newRef, {
        git_hash: gitHash,
        created_at: now,
        updated_at: now,
      })
    })
    console.info(`[${this.key}] Just applied (batched)!`)
  }
}

const maxConcurrency = 4

export async function migrate(src: Record<string, Migration>) {
  const edges: Record<string, JobEdge> = {}
  for (const [key, migration] of Object.entries(src)) {
    if (migration.key === undefined) {
      migration.key = key
    } else if (key !== migration.key) {
      throw Error("Something went wrong.")
    }
    edges[key] = new JobEdge(key, migration)
  }
  for (const itself of Object.values(edges)) {
    if (itself.migration.conf?.dependsOn?.length) {
      for (const parent of new Set(itself.migration.conf.dependsOn)) {
        if (parent.key === undefined) {
          throw new Error(`Migration '${itself.key}' depends on a not-exported migration.`)
        }
        const source = edges[parent.key]
        itself.sources.add(source)
        source.targets.add(itself)
      }
    }
  }
  const tasks = new Set<Promise<void>>
  const queue = Object.values(edges).filter(e => e.sources.size === 0)
  while (queue.length !== 0 || tasks.size !== 0) {
    for (const job of queue.splice(0, maxConcurrency - tasks.size)) {
      const task = (async () => {
        await job.run(firestore)
        for (const target of job.targets) {
          target.sources.delete(job)
          if (target.sources.size === 0) {
            queue.push(target)
          }
        }
      })()
      tasks.add(task)
      task.then(() => tasks.delete(task), () => tasks.delete(task)).catch(() => undefined)
    }
    await Promise.race(tasks)
  }
}

async function getGitHash() {
  const { GIT_HASH } = process.env
  if (typeof GIT_HASH === "string") {
    return GIT_HASH
  }
  const { stdout } = await promisify(exec)("git rev-parse HEAD")
  return stdout.trim()
}
