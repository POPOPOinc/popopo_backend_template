import {createNodeConfig} from "../eslint/eslint-base-node.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import customPlugin from "./eslint-rules/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: ["**/src/api/*/**"],
  },
  ...createNodeConfig(__dirname),
  {
    plugins: {
      "schema": customPlugin,
    },
    rules: {
      "schema/firestore-snake-case": "error",
      "schema/firestore-kebab-case": "error",
    },
  },
];
