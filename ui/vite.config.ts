import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

export default defineConfig({
  build: {
    target: "esnext",
    minify: false,
    emptyOutDir: true,
    outDir: resolve(__dirname, "../functions/frontend/dist/public"),
  },
  plugins: [viteSingleFile()],
});
