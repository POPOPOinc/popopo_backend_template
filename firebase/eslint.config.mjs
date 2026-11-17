import firestoreIndexesStructure from "./eslint-rules/firestore-indexes-structure.js";
import * as jsoncParser from "jsonc-eslint-parser";

export default [
  {
    ignores: ["eslint-rules/**"],
  },
  {
    files: ["**/firestore.indexes.json"],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      custom: {
        rules: {
          "firestore-indexes-structure": firestoreIndexesStructure,
        },
      },
    },
    rules: {
      "custom/firestore-indexes-structure": "error",
    },
  },
];
