/// <reference types="vitest/config" />

import { chmodSync, readFileSync } from "fs";
import { join, resolve } from "path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

const isCI = process.env.CI === String(true);
console.log(`Building in ${isCI ? "CI" : "local"} mode...`);

const packageJsonPath = resolve(__dirname, "package.json");
const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version: string };

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    dts({
      tsconfigPath: join(__dirname, "tsconfig.lib.json"),
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    }),
    {
      name: "make-cli-executable",
      closeBundle() {
        if (isCI) {
          return;
        }

        const cliFiles = [resolve(__dirname, "dist/cli.js"), resolve(__dirname, "dist/cli.cjs")];
        cliFiles.forEach((file) => {
          try {
            chmodSync(file, 0o755);
            console.log(`✓ Made ${file.split("/").pop()} executable`);
          } catch (err) {
            console.warn(`Could not make ${file} executable:`, err);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "next-typed-paths/axios": resolve(__dirname, "src/axios/index.ts"),
      "next-typed-paths/client": resolve(__dirname, "src/client/index.ts"),
      "next-typed-paths/contracts": resolve(__dirname, "src/contracts/index.ts"),
      "next-typed-paths/next": resolve(__dirname, "src/next/index.ts"),
      "next-typed-paths/runtime": resolve(__dirname, "src/runtime/index.ts"),
      "next-typed-paths": resolve(__dirname, "src/index.ts"),
    },
    tsconfigPaths: true,
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
        "axios/index": resolve(__dirname, "src/axios/index.ts"),
        "client/index": resolve(__dirname, "src/client/index.ts"),
        "contracts/index": resolve(__dirname, "src/contracts/index.ts"),
        "next/index": resolve(__dirname, "src/next/index.ts"),
        "runtime/index": resolve(__dirname, "src/runtime/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    minify: isCI,
    rollupOptions: {
      external: [
        "axios",
        "chokidar",
        "commander",
        "cosmiconfig",
        "fs",
        "fs/promises",
        "lodash-es",
        "path",
        "prettier",
        "ts-morph",
        "url",
        "zod",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    globals: true,
  },
});
