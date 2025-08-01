import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

export default defineConfig({
  build: {
    target: "esnext",
    minify: true,
    emptyOutDir: true,
    outDir: resolve(__dirname, "../build/dist"),
  },
  plugins: [viteSingleFile()],
});
