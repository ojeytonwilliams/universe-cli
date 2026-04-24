// oxlint-disable jest/no-conditional-in-test
// oxlint-disable typescript/require-await
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PackageInstallError } from "../../../errors/cli-errors.js";
import { PnpmPackageManager } from "./pnpm-package-manager.js";

const PNPM_LIST_OUTPUT = JSON.stringify([
  {
    dependencies: { express: { version: "5.1.2" } },
    devDependencies: { typescript: { version: "5.9.3" } },
    name: "my-app",
  },
]);

describe(PnpmPackageManager, () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "pnpm-pm-test-"));
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { express: "^5" }, devDependencies: { typescript: "^5" } }),
      "utf8",
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { force: true, recursive: true });
  });

  const makeHappyRunner = () => ({
    async installLockfileOnly(cwd: string) {
      await writeFile(join(cwd, "pnpm-lock.yaml"), "", "utf8");
    },
    async list(_cwd: string) {
      return PNPM_LIST_OUTPUT;
    },
  });

  describe("specifyDeps", () => {
    it("creates a lockfile", async () => {
      const adapter = new PnpmPackageManager(makeHappyRunner());
      await adapter.specifyDeps(tmpDir);
      await expect(access(join(tmpDir, "pnpm-lock.yaml"))).resolves.toBeUndefined();
    });

    it("pins versions in package.json", async () => {
      const adapter = new PnpmPackageManager(makeHappyRunner());
      await adapter.specifyDeps(tmpDir);
      const content = JSON.parse(await readFile(join(tmpDir, "package.json"), "utf8")) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(content.dependencies["express"]).toBe("5.1.2");
      expect(content.devDependencies["typescript"]).toBe("5.9.3");
    });

    it("produces a pinned lockfile", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          await writeFile(join(cwd, "pnpm-lock.yaml"), "", "utf8");
        },
        async list(_cwd: string) {
          return PNPM_LIST_OUTPUT;
        },
      };
      const adapter = new PnpmPackageManager(runner);
      await adapter.specifyDeps(tmpDir);
      expect(installCount).toBe(2);
    });

    it("throws PackageInstallError when installLockfileOnly fails", async () => {
      const runner = {
        async installLockfileOnly(_cwd: string) {
          throw new Error("pnpm exited with code 1");
        },
        async list(_cwd: string) {
          return "";
        },
      };
      const adapter = new PnpmPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
    });

    it("throws PackageInstallError if lockfile was not created after the first install", async () => {
      let listCalled = false;
      const runner = {
        async installLockfileOnly(_cwd: string) {
          // Deliberately does not create a lockfile
        },
        async list(_cwd: string) {
          listCalled = true;
          return PNPM_LIST_OUTPUT;
        },
      };
      const adapter = new PnpmPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
      expect(listCalled).toBe(false);
    });

    it("throws PackageInstallError when the pinning install fails", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          if (installCount === 1) {
            await writeFile(join(cwd, "pnpm-lock.yaml"), "", "utf8");
          } else {
            throw new Error("pnpm exited with code 1");
          }
        },
        async list(_cwd: string) {
          return PNPM_LIST_OUTPUT;
        },
      };
      const adapter = new PnpmPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
    });

    it("throws PackageInstallError if lockfile was not created after the pinning install", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          if (installCount === 1) {
            await writeFile(join(cwd, "pnpm-lock.yaml"), "", "utf8");
          }
          // Second call: deliberately does not create a lockfile
        },
        async list(_cwd: string) {
          return PNPM_LIST_OUTPUT;
        },
      };
      const adapter = new PnpmPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
    });
  });
});
