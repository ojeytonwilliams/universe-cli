import type { PackageManagerLayerData } from "./layer-types.js";

const bunPackageManagerLayer: PackageManagerLayerData = {
  devCmd: ["bun", "run", "dev"],
  devInstall: "RUN npm install -g bun\nCOPY package.json bun.lock ./\nRUN bun install",
  files: {
    ".dockerignore": ["node_modules", "dist", ".git", ""].join("\n"),
  },
  watchRebuild: [{ path: "./package.json" }, { path: "./bun.lock" }],
};

const pnpmPackageManagerLayer: PackageManagerLayerData = {
  devCmd: ["pnpm", "run", "dev"],
  devInstall: "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
  files: {
    ".dockerignore": ["node_modules", "dist", ".git", ""].join("\n"),
    "pnpm-workspace.yaml": [
      "blockExoticSubdeps: true",
      "minimumReleaseAge: 1440",
      "trustPolicy: no-downgrade",
      "engineStrict: true",
      "",
    ].join("\n"),
  },
  preinstall: "npx only-allow pnpm",
  watchRebuild: [{ path: "./package.json" }, { path: "./pnpm-lock.yaml" }],
};

const packageManagersLayer = {
  "package-managers/bun": bunPackageManagerLayer,
  "package-managers/pnpm": pnpmPackageManagerLayer,
};

const typedPackageManagerLayers: Record<string, PackageManagerLayerData | undefined> = {
  "package-managers/bun": bunPackageManagerLayer,
  "package-managers/pnpm": pnpmPackageManagerLayer,
};

export { packageManagersLayer, typedPackageManagerLayers };
