import esbuild from 'esbuild'

await esbuild.build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	splitting: true,
	platform: 'node',
	format: 'esm',
	outdir: 'out',
	outExtension: { ".js" : ".mjs" },
	// https://github.com/evanw/esbuild/issues/1921
	inject: ['cjs-shim.ts'],
})
