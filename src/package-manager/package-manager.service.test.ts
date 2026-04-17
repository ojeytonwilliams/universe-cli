import { PackageManagerService } from "./package-manager.service.js";
import type { PackageManager } from "./package-manager.port.js";

const makeMockManager = (): PackageManager => ({
  install: vi.fn().mockResolvedValue(undefined),
  specifyDeps: vi.fn().mockResolvedValue(undefined),
});

describe(PackageManagerService, () => {
  let pnpm: PackageManager;
  let bun: PackageManager;
  let svc: PackageManagerService;

  beforeEach(() => {
    pnpm = makeMockManager();
    bun = makeMockManager();
    svc = new PackageManagerService({ bun, pnpm });
  });

  it("dispatches to pnpm adapter for pnpm selection", async () => {
    await svc.run({ manager: "pnpm", projectDirectory: "/proj" });
    expect(pnpm.specifyDeps).toHaveBeenCalledWith("/proj"); // oxlint-disable-line unbound-method
    expect(pnpm.install).toHaveBeenCalledWith("/proj"); // oxlint-disable-line unbound-method
    expect(bun.specifyDeps).not.toHaveBeenCalled(); // oxlint-disable-line unbound-method
    expect(bun.install).not.toHaveBeenCalled(); // oxlint-disable-line unbound-method
  });

  it("dispatches to bun adapter for bun selection", async () => {
    await svc.run({ manager: "bun", projectDirectory: "/proj" });
    expect(bun.specifyDeps).toHaveBeenCalledWith("/proj"); // oxlint-disable-line unbound-method
    expect(bun.install).toHaveBeenCalledWith("/proj"); // oxlint-disable-line unbound-method
    expect(pnpm.specifyDeps).not.toHaveBeenCalled(); // oxlint-disable-line unbound-method
    expect(pnpm.install).not.toHaveBeenCalled(); // oxlint-disable-line unbound-method
  });

  it("throws for unknown manager", async () => {
    await expect(
      svc.run({ manager: "yarn" as unknown as "bun", projectDirectory: "/proj" }),
    ).rejects.toThrow(/Unknown package manager/);
  });

  it("propagates errors from adapters", async () => {
    vi.spyOn(pnpm, "install").mockRejectedValue(new Error("fail"));
    await expect(svc.run({ manager: "pnpm", projectDirectory: "/proj" })).rejects.toThrow("fail");
  });
});
