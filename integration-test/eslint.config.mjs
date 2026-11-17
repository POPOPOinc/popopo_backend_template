import path from "node:path"
import { fileURLToPath } from "node:url"
import { createCLIConfig } from "../eslint/eslint-base-cli.config.mjs"
import firestoreIndexCheck from "../eslint/firestore-index-check.mjs"
import noBracketIdentifierLiteral from "../eslint/no-bracket-identifier-literal.mjs"
import noDirectAdminFirestore from "../eslint/no-direct-admin-firestore.mjs"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createCLIConfig(__dirname);

export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'jest.config.ts'],
  },
  {
    plugins: {
      "custom": {
        rules: {
          "firestore-index-check": firestoreIndexCheck,
          "no-bracket-identifier-literal": noBracketIdentifierLiteral,
          "no-direct-admin-firestore": noDirectAdminFirestore
        }
      }
    },
    rules: {
      ...baseConfig[baseConfig.length - 1].rules,
      "custom/firestore-index-check": "error",
      "custom/no-bracket-identifier-literal": "error",
      "custom/no-direct-admin-firestore": "error"
    }
  }
];
