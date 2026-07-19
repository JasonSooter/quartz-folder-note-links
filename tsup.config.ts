import { defineConfig } from "tsup";

// Singleton packages that MUST resolve to Quartz's own copy at runtime — never
// bundle these (they'd create duplicate instances / break instanceof checks).
const SINGLETON_EXTERNALS = [
  "@jackyzha0/quartz",
  "@jackyzha0/quartz/*",
  "vfile",
  "vfile/*",
  "unified",
];

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  splitting: false,
  // Bundle @quartz-community/utils + unist-util-visit so the dist is
  // self-contained and installs like any other prebuilt community plugin.
  noExternal: [/.*/],
  external: SINGLETON_EXTERNALS,
  outDir: "dist",
  platform: "node",
});
