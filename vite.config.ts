import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, cpSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "frozen-reference",
      configureServer(server) {
        server.middlewares.use(
          "/tests/port-cases.html",
          async (_req, res, next) => {
            try {
              const html = readFileSync(
                "reference/hyalite-v0.5.0/demo/cases.html",
                "utf8",
              )
                .replace(/<script src="[^\"]+"><\/script>/, "")
                .replace(
                  "<script>",
                  '<script type="module">\nimport Hyalite from "/src/core/index.ts";',
                );
              res.setHeader("Content-Type", "text/html");
              res.end(
                await server.transformIndexHtml("/tests/port-cases.html", html),
              );
            } catch (e) {
              next(e);
            }
          },
        );
      },
      closeBundle() {
        // Keep the frozen engine and its standalone demos available in the built playground.
        cpSync(
          "reference/hyalite-v0.5.0",
          "dist-playground/reference/hyalite-v0.5.0",
          {
            recursive: true,
          },
        );
      },
    },
  ],
  build: {
    outDir: "dist-playground",
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        frame: resolve("frame.html"),
        components: resolve("components.html"),
      },
    },
  },
});
