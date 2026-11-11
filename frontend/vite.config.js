import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
export default defineConfig({
  server: { proxy: { "/api": "http://127.0.0.1:5080" } },
  plugins: [
    {
      name: "offline-shell-index",
      closeBundle() {
        const root = path.resolve("../backend/wwwroot");
        const files = [];
        function walk(dir) {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (
              !["service-worker.js", "precache-assets.json"].includes(e.name)
            )
              files.push(
                "/" + path.relative(root, p).split(path.sep).join("/"),
              );
          }
        }
        walk(root);
        fs.writeFileSync(
          path.join(root, "precache-assets.json"),
          JSON.stringify(files),
        );
      },
    },
  ],
  build: { outDir: "../backend/wwwroot", emptyOutDir: true },
});
