import {createBaseConfig} from "./eslint-base.config.mjs";
import globals from "globals";

export function createReactConfig(projectDir) {
  return createBaseConfig(projectDir, {
    environmentGlobals: {
      ...globals.browser,
      ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "off"])),
    },
    extendsConfig: [
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
    ],
    consoleRule: ["warn", {
      allow: ["info", "warn", "error"],
    }],
    sourceType: "script",
    additionalSettings: {
      react: {
        version: "detect"
      }
    },
    additionalRules: {
      "react/react-in-jsx-scope": "off",
      "react-hook-form/no-formstate-in-jsx": "error",
    },
    useFixupConfigRules: true
  });
}
