import {createBaseConfig} from "./eslint-base.config.mjs";
import globals from "globals";

export function createCLIConfig(projectDir) {
  return createBaseConfig(projectDir, {
    environmentGlobals: {
      ...globals.browser,
      ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "off"])),
    },
    consoleRule: ["warn", {
      allow: ["dir", "debug", "info", "warn", "error"],
    }],
    sourceType: "script",
    additionalSettings: {},
    additionalRules: {},
    useFixupConfigRules: true
  });
}
