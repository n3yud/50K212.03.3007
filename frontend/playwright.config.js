import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5080",
    launchOptions: {
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
      args: ["--disable-gpu"],
    },
  },
  reporter: "list",
  outputDir: "../artifacts/browser-results",
});
