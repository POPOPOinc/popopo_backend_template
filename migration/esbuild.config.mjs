import esbuild from 'esbuild'
import { globSync } from 'node:fs'

const migrations = globSync(`${import.meta.dirname}/migrations/**/*.ts`)

await esbuild.build({
	entryPoints: ['src/main.ts', ... migrations],
	bundle: true,
	splitting: true,
	platform: 'node',
	format: 'esm',
	outdir: 'out',
	outExtension: { ".js" : ".mjs" },
	// https://github.com/evanw/esbuild/issues/1921
	inject: ['cjs-shim.ts'],
})


