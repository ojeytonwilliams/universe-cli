import { defineConfig } from "tsdown";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  deps: {
    alwaysBundle: [/./],
  },
  dts: false,
  entry: ["src/bin.ts"],
  format: "cjs",
  outDir: "dist/sea",
});
