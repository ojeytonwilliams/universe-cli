import { parse as parseYaml } from "yaml";
import { packageManagersLayer } from "./package-managers-layer.js";

const pnpmLayer = packageManagersLayer["package-managers/pnpm"];

describe("package-managers/pnpm layer", () => {
  describe("dockerfileData", () => {
    it("provides devInstall that copies lockfiles and runs pnpm install via corepack", () => {
      expect(pnpmLayer.dockerfileData?.devInstall).toBe(
        "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
      );
    });

    it("provides devCmd as the pnpm run dev array", () => {
      expect(pnpmLayer.dockerfileData?.devCmd).toStrictEqual(["pnpm", "run", "dev"]);
    });
  });

  describe("files", () => {
    it("includes a .dockerignore that excludes node_modules, dist, and .git", () => {
      const dockerignore = pnpmLayer.files[".dockerignore"];

      expect(dockerignore).toContain("node_modules");
      expect(dockerignore).toContain("dist");
      expect(dockerignore).toContain(".git");
    });

    it("includes a docker-compose.dev.yml fragment with build context and target", () => {
      const raw = pnpmLayer.files["docker-compose.dev.yml"];
      const parsed = parseYaml(raw) as Record<string, unknown>;
      const app = (parsed["services"] as Record<string, unknown>)["app"] as Record<string, unknown>;

      expect((app["build"] as Record<string, unknown>)["context"]).toBe("./");
      expect((app["build"] as Record<string, unknown>)["target"]).toBe("dev");
    });

    it("includes develop.watch with sync and rebuild actions", () => {
      const raw = pnpmLayer.files["docker-compose.dev.yml"];
      const parsed = parseYaml(raw) as Record<string, unknown>;
      const app = (parsed["services"] as Record<string, unknown>)["app"] as Record<string, unknown>;
      const watch = (app["develop"] as Record<string, unknown>)["watch"] as Record<
        string,
        unknown
      >[];

      const syncEntry = watch.find((e) => e["action"] === "sync");
      const rebuildEntry = watch.find((e) => e["action"] === "rebuild");

      expect(syncEntry?.["path"]).toBe("./src");
      expect(syncEntry?.["target"]).toBe("/app/src");
      expect(rebuildEntry?.["path"]).toBe("./package.json");
    });

    it("docker-compose.dev.yml fragment has no image key", () => {
      const raw = pnpmLayer.files["docker-compose.dev.yml"];
      const parsed = parseYaml(raw) as Record<string, unknown>;
      const app = (parsed["services"] as Record<string, unknown>)["app"] as Record<string, unknown>;

      expect(app["image"]).toBeUndefined();
    });
  });
});
