// oxlint-disable jest/no-conditional-in-test
// oxlint-disable typescript/require-await
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PackageInstallError } from "../../../errors/cli-errors.js";
import { BunPackageManager } from "./bun-package-manager.js";

const BUN_LIST_OUTPUT = "node_modules (1)\n├── foo@1.2.3\n";

describe(BunPackageManager, () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "bun-pm-test-"));
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { foo: "^1.0.0" } }),
      "utf8",
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { force: true, recursive: true });
  });

  const makeHappyRunner = () => ({
    async installLockfileOnly(cwd: string) {
      await writeFile(join(cwd, "bun.lock"), "", "utf8");
    },
    async list(_cwd: string) {
      return BUN_LIST_OUTPUT;
    },
  });

  describe("specifyDeps", () => {
    it("creates a lockfile", async () => {
      const adapter = new BunPackageManager(makeHappyRunner());
      await adapter.specifyDeps(tmpDir);
      await expect(access(join(tmpDir, "bun.lock"))).resolves.toBeUndefined();
    });

    it("pins versions in package.json", async () => {
      const adapter = new BunPackageManager(makeHappyRunner());
      await adapter.specifyDeps(tmpDir);
      const content = JSON.parse(await readFile(join(tmpDir, "package.json"), "utf8")) as {
        dependencies: Record<string, string>;
      };
      expect(content.dependencies["foo"]).toBe("1.2.3");
    });

    it("installs a pinned lockfile", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          await writeFile(join(cwd, "bun.lock"), "", "utf8");
        },
        async list(_cwd: string) {
          return BUN_LIST_OUTPUT;
        },
      };
      const adapter = new BunPackageManager(runner);
      await adapter.specifyDeps(tmpDir);
      expect(installCount).toBe(2);
    });

    it("throws PackageInstallError when installLockfileOnly fails", async () => {
      const runner = {
        async installLockfileOnly(_cwd: string) {
          throw new Error("bun exited with code 1");
        },
        async list(_cwd: string) {
          return "";
        },
      };
      const adapter = new BunPackageManager(runner);
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
          return BUN_LIST_OUTPUT;
        },
      };
      const adapter = new BunPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
      expect(listCalled).toBe(false);
    });

    it("throws PackageInstallError when the pinning install fails", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          if (installCount === 1) {
            await writeFile(join(cwd, "bun.lock"), "", "utf8");
          } else {
            throw new Error("bun exited with code 1");
          }
        },
        async list(_cwd: string) {
          return BUN_LIST_OUTPUT;
        },
      };
      const adapter = new BunPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
    });

    it("throws PackageInstallError if lockfile was not created after the pinning install", async () => {
      let installCount = 0;
      const runner = {
        async installLockfileOnly(cwd: string) {
          installCount++;
          if (installCount === 1) {
            await writeFile(join(cwd, "bun.lock"), "", "utf8");
          }
          // Second call: deliberately does not create a lockfile
        },
        async list(_cwd: string) {
          return BUN_LIST_OUTPUT;
        },
      };
      const adapter = new BunPackageManager(runner);
      await expect(adapter.specifyDeps(tmpDir)).rejects.toBeInstanceOf(PackageInstallError);
    });
  });
});
