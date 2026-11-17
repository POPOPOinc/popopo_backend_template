import type { Config } from "jest"

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/test/**/*.ts"],
  // メンテナンスのテストは全ユーザーの API を止めるので、明示的にパスを指定したときだけ回す（integration-test-maintenance.yml）
  testPathIgnorePatterns: process.argv.some(arg => arg.includes("maintenance-test")) ? [] : ["/src/test/maintenance-test.ts"],
  testTimeout: 30000,
  globalSetup: "<rootDir>/src/setup/global.ts",
  globalTeardown: "<rootDir>/src/setup/teardown.ts",
}

export default config
