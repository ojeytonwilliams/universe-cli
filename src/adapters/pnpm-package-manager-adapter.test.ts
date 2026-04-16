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

describe(PnpmPackageManagerAdapter, () => {
  const makeMock = () => {
    const pnpm = {
      install: vi.fn(),
      installLockfileOnly: vi.fn(),
      list: vi.fn(),
    };
    const filesystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    return { filesystem, pnpm };
  };

  describe("specifyDeps", () => {
    it("creates a lockfile and does not install modules", async () => {
      const { pnpm, filesystem } = makeMock();
      pnpm.installLockfileOnly.mockResolvedValueOnce(undefined);
      pnpm.list.mockResolvedValueOnce(PNPM_LIST_OUTPUT);
      filesystem.readFile.mockResolvedValueOnce(
        JSON.stringify({ dependencies: { express: "^5" }, devDependencies: { typescript: "^5" } }),
      );
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new PnpmPackageManagerAdapter(pnpm, filesystem);

      await adapter.specifyDeps("/proj");

      expect(pnpm.installLockfileOnly).toHaveBeenCalledWith("/proj");
      expect(pnpm.list).toHaveBeenCalledWith("/proj");
      expect(pnpm.install).not.toHaveBeenCalled();
    });

    it("pins versions in package.json", async () => {
      const { pnpm, filesystem } = makeMock();
      pnpm.installLockfileOnly.mockResolvedValueOnce(undefined);
      pnpm.list.mockResolvedValueOnce(PNPM_LIST_OUTPUT);
      filesystem.readFile.mockResolvedValueOnce(
        JSON.stringify({ dependencies: { express: "^5" }, devDependencies: { typescript: "^5" } }),
      );
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new PnpmPackageManagerAdapter(pnpm, filesystem);

      await adapter.specifyDeps("/proj");

      const [writePath, writtenContent] = filesystem.writeFile.mock.calls[0] as [string, string];
      const written = JSON.parse(writtenContent) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(writePath).toBe(join("/proj", "package.json"));
      expect(written.dependencies["express"]).toBe("5.1.2");
      expect(written.devDependencies["typescript"]).toBe("5.9.3");
    });

    it("throws PackageInstallError when installLockfileOnly fails", async () => {
      const { pnpm, filesystem } = makeMock();
      pnpm.installLockfileOnly.mockRejectedValueOnce(new Error("pnpm exited with code 1"));
      const adapter = new PnpmPackageManagerAdapter(pnpm, filesystem);
      await expect(adapter.specifyDeps("/proj")).rejects.toBeInstanceOf(PackageInstallError);
    });
  });

  describe("install", () => {
    it("runs a full install in the given directory", async () => {
      const { pnpm, filesystem } = makeMock();
      pnpm.install.mockResolvedValueOnce(undefined);
      const adapter = new PnpmPackageManagerAdapter(pnpm, filesystem);

      await adapter.install("/proj");

      expect(pnpm.install).toHaveBeenCalledWith("/proj");
    });

    it("throws PackageInstallError when install fails", async () => {
      const { pnpm, filesystem } = makeMock();
      pnpm.install.mockRejectedValueOnce(new Error("pnpm exited with code 1"));
      const adapter = new PnpmPackageManagerAdapter(pnpm, filesystem);
      await expect(adapter.install("/proj")).rejects.toBeInstanceOf(PackageInstallError);
    });
  });
});
