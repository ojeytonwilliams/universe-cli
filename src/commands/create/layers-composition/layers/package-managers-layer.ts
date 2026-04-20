import type { PackageManagerLayerData } from "./layer-types.js";

const pnpmPackageManagerLayer: PackageManagerLayerData = {
  devCmd: ["pnpm", "run", "dev"],
  devInstall: "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
  files: {
    ".dockerignore": ["node_modules", "dist", ".git", ""].join("\n"),
    "package.json": JSON.stringify({
      scripts: {
        dev: "pnpm run build && pnpm run start",
        preinstall: "npx only-allow pnpm",
      },
    }),
    "pnpm-workspace.yaml": [
      "blockExoticSubdeps: true",
      "minimumReleaseAge: 1440",
      "trustPolicy: no-downgrade",
      "engineStrict: true",
      "",
    ].join("\n"),
    "start.sh": "pnpm install && pnpm dev\n",
  },
  watchRebuild: [{ path: "./package.json" }, { path: "./pnpm-lock.yaml" }],
};

const packageManagersLayer = {
  "package-managers/bun": {
    files: {
      "package.json": JSON.stringify({
        scripts: {
          dev: "bun run build && bun run start",
        },
      }),
      "start.sh": "bun install && bun dev\n",
    },
  },
  "package-managers/pnpm": pnpmPackageManagerLayer,
};

const typedPackageManagerLayers: Record<string, PackageManagerLayerData | undefined> = {
  "package-managers/pnpm": pnpmPackageManagerLayer,
};

export { packageManagersLayer, typedPackageManagerLayers };
