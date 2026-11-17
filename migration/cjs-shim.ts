import { createRequire } from 'node:module'

globalThis.require = createRequire(import.meta.url)

const { pathname } = new URL(import.meta.url)
globalThis.__filename = pathname
globalThis.__dirname  = pathname.replace(/\/.*?$/)
