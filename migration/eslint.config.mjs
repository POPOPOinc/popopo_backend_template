import {createNodeConfig} from "../eslint/eslint-base-node.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createNodeConfig(__dirname);

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'jest.config.ts'],
  },
  {
    // CLI ツールなので進捗を標準出力に出す
    rules: { 'no-console': 'off' },
  },
];
