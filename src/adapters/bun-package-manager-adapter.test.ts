import { BunPackageManagerAdapter } from "./bun-package-manager-adapter.js";

describe(BunPackageManagerAdapter, () => {
  const makeMock = () => {
    const run = vi.fn();
    const filesystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    return { filesystem, run };
  };

  it("runs bun install --frozen-lockfile and pins versions", async () => {
    const { run, filesystem } = makeMock();
    run.mockResolvedValueOnce("").mockResolvedValueOnce('[{"name":"foo","version":"1.2.3"}]');
    filesystem.readFile.mockResolvedValueOnce('{"dependencies":{"foo":"^1.0.0"}}');
    filesystem.writeFile.mockResolvedValueOnce(undefined);
    const adapter = new BunPackageManagerAdapter(run, filesystem);
    await adapter.specifyDeps("/proj");
    expect(run).toHaveBeenCalledWith("bun", ["install", "--frozen-lockfile"], "/proj");
    expect(run).toHaveBeenCalledWith("bun", ["list", "--json"], "/proj");
    expect(filesystem.readFile).toHaveBeenCalledWith("/proj/package.json");
    expect(filesystem.writeFile).toHaveBeenCalledWith(
      "/proj/package.json",
      JSON.stringify({ dependencies: { foo: "1.2.3" } }),
    );
  });

  it("runs bun install for install", async () => {
    const { run, filesystem } = makeMock();
    run.mockResolvedValueOnce("");
    const adapter = new BunPackageManagerAdapter(run, filesystem);
    await adapter.install("/proj");
    expect(run).toHaveBeenCalledWith("bun", ["install"], "/proj");
  });

  it("throws PackageInstallError on specifyDeps failure", async () => {
    const { run, filesystem } = makeMock();
    run.mockRejectedValueOnce(new Error("fail"));
    const adapter = new BunPackageManagerAdapter(run, filesystem);
    await expect(adapter.specifyDeps("/proj")).rejects.toThrow("fail");
  });

  it("throws PackageInstallError on install failure", async () => {
    const { run, filesystem } = makeMock();
    run.mockRejectedValueOnce(new Error("fail"));
    const adapter = new BunPackageManagerAdapter(run, filesystem);
    await expect(adapter.install("/proj")).rejects.toThrow("fail");
  });
});
