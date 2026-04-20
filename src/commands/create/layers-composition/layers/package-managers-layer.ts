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
    dockerfileData: {
      devCmd: ["pnpm", "run", "dev"],
      devInstall: "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
    },
    files: {
      ".dockerignore": ["node_modules", "dist", ".git", ""].join("\n"),
      "docker-compose.dev.yml": [
        "services:",
        "  app:",
        "    build:",
        "      context: ./",
        "      target: dev",
        "    develop:",
        "      watch:",
        "        - action: sync",
        "          path: ./src",
        "          target: /app/src",
        "        - action: rebuild",
        "          path: ./package.json",
        "",
      ].join("\n"),
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
