import { join } from "node:path";
import { PackageInstallError } from "../errors/cli-errors.js";
import { PnpmPackageManagerAdapter } from "./pnpm-package-manager-adapter.js";

const PNPM_LIST_OUTPUT = JSON.stringify([
  {
    dependencies: {
      express: { version: "5.1.2" },
    },
    devDependencies: {
      typescript: { version: "5.9.3" },
    },
    name: "my-app",
  },
]);

const makeRun = (outputs: Record<string, string> = {}) =>
  vi.fn((command: string, args: string[]) => {
    const key = [command, ...args].join(" ");
    return Promise.resolve(outputs[key] ?? "");
  });

const makeFilesystem = (files: Record<string, string>) => ({
  readFile: vi.fn((path: string) => {
    const content = files[path];
    if (content === undefined) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }
    return Promise.resolve(content);
  }),
  writeFile: vi.fn((_path: string, _content: string) => Promise.resolve()),
});

describe(PnpmPackageManagerAdapter, () => {
  describe("specifyDeps", () => {
    it("runs pnpm install --lockfile-only then pnpm list --json --depth=0 --lockfile-only", async () => {
      const dir = "/some/project";
      const run = makeRun({
        "pnpm list --json --depth=0 --lockfile-only": PNPM_LIST_OUTPUT,
      });
      const pkg = JSON.stringify({
        dependencies: { express: "^5" },
        devDependencies: { typescript: "^5" },
      });
      const fs = makeFilesystem({ [join(dir, "package.json")]: pkg });
      const adapter = new PnpmPackageManagerAdapter(run, fs);

      await adapter.specifyDeps(dir);

      expect(run).toHaveBeenNthCalledWith(1, "pnpm", ["install", "--lockfile-only"], dir);
      expect(run).toHaveBeenNthCalledWith(
        2,
        "pnpm",
        ["list", "--json", "--depth=0", "--lockfile-only"],
        dir,
      );
    });

    it("writes exact versions from pnpm list output back to package.json", async () => {
      const dir = "/some/project";
      const run = makeRun({
        "pnpm list --json --depth=0 --lockfile-only": PNPM_LIST_OUTPUT,
      });
      const pkg = JSON.stringify({
        dependencies: { express: "^5" },
        devDependencies: { typescript: "^5" },
        name: "my-app",
      });
      const fs = makeFilesystem({ [join(dir, "package.json")]: pkg });
      const adapter = new PnpmPackageManagerAdapter(run, fs);

      await adapter.specifyDeps(dir);

      const [writePath, writtenContent] = fs.writeFile.mock.calls[0]!;
      const written = JSON.parse(writtenContent) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      expect(writePath).toBe(join(dir, "package.json"));
      expect(written.dependencies["express"]).toBe("5.1.2");
      expect(written.devDependencies["typescript"]).toBe("5.9.3");
    });

    it("throws PackageInstallError when pnpm install --lockfile-only exits non-zero", async () => {
      const dir = "/some/project";
      const run = vi.fn(() => Promise.reject(new Error("pnpm exited with code 1")));
      const adapter = new PnpmPackageManagerAdapter(run, {
        readFile: vi.fn(),
        writeFile: vi.fn(),
      });

      await expect(adapter.specifyDeps(dir)).rejects.toBeInstanceOf(PackageInstallError);
    });
  });

  describe("install", () => {
    it("runs pnpm install in the given directory", async () => {
      const dir = "/some/project";
      const run = vi.fn(() => Promise.resolve(""));
      const adapter = new PnpmPackageManagerAdapter(run, {
        readFile: vi.fn(),
        writeFile: vi.fn(),
      });

      await adapter.install(dir);

      expect(run).toHaveBeenCalledWith("pnpm", ["install"], dir);
    });

    it("throws PackageInstallError when pnpm install exits non-zero", async () => {
      const dir = "/some/project";
      const run = vi.fn(() => Promise.reject(new Error("pnpm exited with code 1")));
      const adapter = new PnpmPackageManagerAdapter(run, {
        readFile: vi.fn(),
        writeFile: vi.fn(),
      });

      await expect(adapter.install(dir)).rejects.toBeInstanceOf(PackageInstallError);
    });
  });
});
