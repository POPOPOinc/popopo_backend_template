import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
    publicDir: `${__dirname}/../schema/api`,
    root: `./src`,
    server: {
      host: "localhost",
      port: 6741,
    },
    build: {
      target: "es2020",
      outDir: `${__dirname}/out`,
    },
  }
})
