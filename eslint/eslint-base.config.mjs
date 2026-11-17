import {defineConfig, globalIgnores} from "eslint/config";
import {fixupConfigRules} from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";
import noGreaterThanOperators from "./no-greater-than-operators.js";
import noFormStateInJsx from "./no-formstate-in-jsx.js";

export function createBaseConfig(projectDir, options = {}) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
  });

  const {
    environmentGlobals = {},
    extendsConfig = [],
    consoleRule = "error",
    sourceType = "commonjs",
    additionalSettings = {},
    additionalRules = {},
    useFixupConfigRules = false
  } = options;

  const extendsArray = [
    "eslint:recommended",
    "plugin:@typescript-eslint/base",
    "plugin:@typescript-eslint/eslint-recommended",
    ...extendsConfig
  ];

  const extendedConfig = useFixupConfigRules 
    ? fixupConfigRules(compat.extends(...extendsArray))
    : compat.extends(...extendsArray);

  return defineConfig([
    globalIgnores(["**/*.js"]),
    {
      extends: extendedConfig,

      plugins: {
        "comparison-operators": {
          rules: {
            "no-greater-than-operators": noGreaterThanOperators
          }
        },
        "react-hook-form": {
          rules: {
            "no-formstate-in-jsx": noFormStateInJsx
          }
        }
      },

      languageOptions: {
        globals: environmentGlobals,

        parser: tsParser,
        ecmaVersion: 5,
        sourceType,

        parserOptions: {
          project: path.resolve(projectDir, './tsconfig.json'),
        },
      },

      settings: additionalSettings,

      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", {
          ignoreRestSiblings: true,
        }],

        "no-console": consoleRule,

        "@typescript-eslint/no-floating-promises": "error",

        "@typescript-eslint/await-thenable": "error",

        "@typescript-eslint/no-misused-promises": ["error", {
          checksVoidReturn: false,
        }],

        "@typescript-eslint/no-explicit-any": "warn",

        "@typescript-eslint/no-non-null-assertion": "error",

        "@typescript-eslint/restrict-template-expressions": "error",

        "default-case": "error",

        "comparison-operators/no-greater-than-operators": "error",

        "no-restricted-syntax": ["error", {
          selector: "TSAsExpression[typeAnnotation.type='TSTypeReference'] > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: "as unknown as Type による型キャストは禁止されています。型を正しく定義してください。"
        }],

        ...additionalRules,
      },
    }]);
}
