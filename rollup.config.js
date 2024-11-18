import swc from "@rollup/plugin-swc";
import { defineConfig } from "rollup";
import fs from "node:fs";

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "cjs",
  },
  plugins: [
    swc({
      swc: {
        minify: true,
        jsc: {
          minify: {
            mangle: true,
            compress: true,
          },
        },
      },
    }),
    {
      name: "shebang",
      renderChunk(code) {
        return `#!/usr/bin/env node\n${code}`;
      },
    },
    {
      name: "chmod",
      generateBundle(bundle) {
        fs.chmodSync(bundle.file || "", "755");
      },
    },
  ],
});
