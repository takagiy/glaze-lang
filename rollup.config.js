import swc from "@rollup/plugin-swc";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import fs from "node:fs";

export default defineConfig({
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "es",
  },
  plugins: [
    commonjs(),
    nodeResolve({
      extensions: [".js", ".ts"],
    }),
    swc(),
    {
      name: "shebang",
      renderChunk(code) {
        return `#!/usr/bin/env node\n${code}`;
      },
    },
    {
      name: "chmod",
      writeBundle(bundle) {
        fs.chmodSync(bundle.file || "", "755");
      },
    },
  ],
});
