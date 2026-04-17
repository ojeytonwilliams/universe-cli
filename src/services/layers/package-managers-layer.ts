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
  "package-managers/pnpm": {
    files: {
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
  },
};

export { packageManagersLayer };
