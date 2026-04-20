import { packageManagersLayer } from "./package-managers-layer.js";

const pnpmLayer = packageManagersLayer["package-managers/pnpm"];

describe("package-managers/pnpm layer", () => {
  it("provides devInstall that copies lockfiles and runs pnpm install via corepack", () => {
    expect(pnpmLayer.devInstall).toBe(
      "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
    );
  });

  it("provides devCmd as the pnpm run dev array", () => {
    expect(pnpmLayer.devCmd).toStrictEqual(["pnpm", "run", "dev"]);
  });

  it("provides watchRebuild entries for package.json and pnpm-lock.yaml", () => {
    expect(pnpmLayer.watchRebuild).toStrictEqual([
      { path: "./package.json" },
      { path: "./pnpm-lock.yaml" },
    ]);
  });

  it("includes a .dockerignore that excludes node_modules, dist, and .git", () => {
    const dockerignore = pnpmLayer.files[".dockerignore"];

    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain("dist");
    expect(dockerignore).toContain(".git");
  });

  it("does not include docker-compose.dev.yml in files", () => {
    expect(pnpmLayer.files["docker-compose.dev.yml"]).toBeUndefined();
  });
});
