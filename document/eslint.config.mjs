import {createNodeConfig} from "../eslint/eslint-base-node.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import customPlugin from './eslint-rules/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createNodeConfig(__dirname);

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'vite.config.ts'],
  },
  {
    plugins: {
      'document': customPlugin,
    },
    rules: {
      'document/check-firestore-paths-coverage': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
