import {createNodeConfig} from "../eslint/eslint-base-node.config.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import noUsecaseToUsecase from "./eslint-rules/no-usecase-to-usecase.mjs";
import noInternalImport from "./eslint-rules/no-internal-import.mjs";
import noServiceInCore from "./eslint-rules/no-service-in-core.mjs";
import firestoreIndexCheck from "../eslint/firestore-index-check.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createNodeConfig(__dirname);

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'eslint-rules/**', 'jest.config.ts', 'scripts/**'],
  },
  {
    plugins: {
      "custom": {
        rules: {
          "no-usecase-to-usecase": noUsecaseToUsecase,
          "no-internal-import": noInternalImport,
          "no-service-in-core": noServiceInCore,
          "firestore-index-check": firestoreIndexCheck
        }
      }
    },
    rules: {
      ...baseConfig[baseConfig.length - 1].rules,
      "custom/no-usecase-to-usecase": "error",
      "custom/no-internal-import": "error",
      "custom/no-service-in-core": "error",
      "custom/firestore-index-check": "error",
    }
  }
];
