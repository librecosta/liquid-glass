import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { devService } from "./scripts/dev-service";
export default defineConfig({
  plugins: [react(), devService()],
  build: {
    outDir: "dist-playground",
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        components: resolve("components.html"),
      },
    },
  },
});
