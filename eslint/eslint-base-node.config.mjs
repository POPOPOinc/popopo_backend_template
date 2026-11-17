import {createBaseConfig} from "./eslint-base.config.mjs";
import globals from "globals";

export function createNodeConfig(projectDir) {
  return createBaseConfig(projectDir, {
    environmentGlobals: {
      ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
      ...globals.node,
    },
    consoleRule: ["error"],
    sourceType: "commonjs",
    additionalSettings: {},
    additionalRules: {
      "no-unused-private-class-members": ["error"],
      "@typescript-eslint/no-unused-vars": ["error", {
        ignoreRestSiblings: true,
        args: "all",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
    useFixupConfigRules: false
  });
}
