import { AsyncLocalStorage } from "async_hooks"

export class ContextManager<T> {
  private storage = new AsyncLocalStorage<T>()

  run<R>(context: T, fn: () => R): R {
    return this.storage.run(context, fn)
  }

  getContext(): T | undefined {
    return this.storage.getStore()
  }

  updateContext(updates: Partial<T>): void {
    const current = this.storage.getStore()
    if (current) {
      Object.assign(current, updates)
    }
  }
}
