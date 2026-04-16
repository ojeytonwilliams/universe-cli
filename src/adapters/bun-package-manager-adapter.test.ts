import { BunPackageManagerAdapter } from "./bun-package-manager-adapter.js";

describe(BunPackageManagerAdapter, () => {
  const makeMock = () => {
    const bun = {
      install: vi.fn(),
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
    it("creates a lockfile and does not install modules", async () => {
      const { bun, filesystem } = makeMock();
      bun.installLockfileOnly.mockResolvedValueOnce(undefined);
      bun.list.mockResolvedValueOnce("node_modules (1)\n├── foo@1.2.3\n");
      filesystem.readFile.mockResolvedValueOnce('{"dependencies":{"foo":"^1.0.0"}}');
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new BunPackageManagerAdapter(bun, filesystem);
      await adapter.specifyDeps("/proj");
      expect(bun.installLockfileOnly).toHaveBeenCalledWith("/proj");
      expect(bun.list).toHaveBeenCalledWith("/proj");
      expect(bun.install).not.toHaveBeenCalled();
    });

    it("pins versions in package.json", async () => {
      const { bun, filesystem } = makeMock();
      bun.installLockfileOnly.mockResolvedValueOnce(undefined);
      bun.list.mockResolvedValueOnce("node_modules (1)\n├── foo@1.2.3\n");
      filesystem.readFile.mockResolvedValueOnce('{"dependencies":{"foo":"^1.0.0"}}');
      filesystem.writeFile.mockResolvedValueOnce(undefined);
      const adapter = new BunPackageManagerAdapter(bun, filesystem);
      await adapter.specifyDeps("/proj");
      expect(filesystem.readFile).toHaveBeenCalledWith("/proj/package.json");
      expect(filesystem.writeFile).toHaveBeenCalledWith(
        "/proj/package.json",
        JSON.stringify({ dependencies: { foo: "1.2.3" } }),
      );
    });
  });

  it("runs a full install for install", async () => {
    const { bun, filesystem } = makeMock();
    bun.install.mockResolvedValueOnce(undefined);
    const adapter = new BunPackageManagerAdapter(bun, filesystem);
    await adapter.install("/proj");
    expect(bun.install).toHaveBeenCalledWith("/proj");
  });

  it("throws PackageInstallError on specifyDeps failure", async () => {
    const { bun, filesystem } = makeMock();
    bun.installLockfileOnly.mockRejectedValueOnce(new Error("fail"));
    const adapter = new BunPackageManagerAdapter(bun, filesystem);
    await expect(adapter.specifyDeps("/proj")).rejects.toThrow("fail");
  });

  it("throws PackageInstallError on install failure", async () => {
    const { bun, filesystem } = makeMock();
    bun.install.mockRejectedValueOnce(new Error("fail"));
    const adapter = new BunPackageManagerAdapter(bun, filesystem);
    await expect(adapter.install("/proj")).rejects.toThrow("fail");
  });
});
