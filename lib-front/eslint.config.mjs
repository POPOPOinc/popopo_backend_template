import {createReactConfig} from "../eslint/eslint-base-react.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import firestoreIndexCheck from "../eslint/firestore-index-check.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createReactConfig(__dirname);

export default [
  ...baseConfig,
  {
    plugins: {
      "custom": {
        rules: {
          "firestore-index-check": firestoreIndexCheck
        }
      }
    },
    rules: {
      ...baseConfig[baseConfig.length - 1].rules,
      "custom/firestore-index-check": "error",
    }
  }
];
