import { renderDockerfile } from "./dockerfile-template.js";

describe(renderDockerfile, () => {
  it("renders a two-stage Dockerfile for pnpm + express", () => {
    const result = renderDockerfile({
      baseImage: "node:22-alpine",
      devCmd: ["pnpm", "run", "dev"],
      devCopySource: "COPY src/ ./src/\nCOPY tsconfig.json ./",
      devInstall: "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
    });

    expect(result).toBe(
      "FROM node:22-alpine AS base\n" +
        "WORKDIR /app\n" +
        "\n" +
        "FROM base AS dev\n" +
        "COPY package.json pnpm-lock.yaml ./\n" +
        "RUN corepack enable pnpm && pnpm install\n" +
        "COPY src/ ./src/\n" +
        "COPY tsconfig.json ./\n" +
        'CMD ["pnpm","run","dev"]\n',
    );
  });

  it("uses the provided baseImage in the base stage", () => {
    const result = renderDockerfile({
      baseImage: "node:20-alpine",
      devCmd: ["npm", "run", "dev"],
      devCopySource: "COPY . .",
      devInstall: "COPY package.json ./\nRUN npm install",
    });

    expect(result).toContain("FROM node:20-alpine AS base");
    expect(result).not.toContain("node:22-alpine");
  });

  it("serialises devCmd as a JSON array in the CMD instruction", () => {
    const result = renderDockerfile({
      baseImage: "node:22-alpine",
      devCmd: ["bun", "run", "dev"],
      devCopySource: "COPY . .",
      devInstall: "COPY package.json ./\nRUN bun install",
    });

    expect(result).toContain('CMD ["bun","run","dev"]');
  });
});
