import { BunPackageManager } from "./bun-package-manager.js";

describe(BunPackageManager, () => {
  const makeMock = () => {
    const bun = {
      installLockfileOnly: vi.fn(),
      list: vi.fn(),
    };
    const filesystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    return { bun, filesystem };
  };

  describe("specifyDeps", () => {
    it("creates a lockfile", async () => {
      const { bun, filesystem } = makeMock();
      bun.installLockfileOnly.mockResolvedValueOnce(undefined);
      bun.list.mockResolvedValueOnce("node_modules (1)\n├── foo@1.2.3\n");
      filesystem.readFile.mockResolvedValueOnce('{"dependencies":{"foo":"^1.0.0"}}');
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new BunPackageManager(bun, filesystem);
      await adapter.specifyDeps("/proj");
      expect(bun.installLockfileOnly).toHaveBeenCalledWith("/proj");
      expect(bun.list).toHaveBeenCalledWith("/proj");
    });

    it("pins versions in package.json", async () => {
      const { bun, filesystem } = makeMock();
      bun.installLockfileOnly.mockResolvedValueOnce(undefined);
      bun.list.mockResolvedValueOnce("node_modules (1)\n├── foo@1.2.3\n");
      filesystem.readFile.mockResolvedValueOnce('{"dependencies":{"foo":"^1.0.0"}}');
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new BunPackageManager(bun, filesystem);
      await adapter.specifyDeps("/proj");
      expect(filesystem.readFile).toHaveBeenCalledWith("/proj/package.json");
      expect(filesystem.writeFile).toHaveBeenCalledWith(
        "/proj/package.json",
        JSON.stringify({ dependencies: { foo: "1.2.3" } }),
      );
    });

    it("throws PackageInstallError on specifyDeps failure", async () => {
      const { bun, filesystem } = makeMock();
      bun.installLockfileOnly.mockRejectedValueOnce(new Error("fail"));
      const adapter = new BunPackageManager(bun, filesystem);
      await expect(adapter.specifyDeps("/proj")).rejects.toThrow("fail");
    });
  });
});
