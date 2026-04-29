import type { TokenStore } from "../../auth/token-store.port.js";
import { handleLogout } from "./index.js";

const makeDeps = () => {
  const tokenStore: TokenStore = {
    deleteToken: vi.fn().mockResolvedValue(undefined),
    loadToken: vi.fn(),
    saveToken: vi.fn(),
  };
  return {
    log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
    tokenStore,
    write: vi.fn(),
  };
};

describe(handleLogout, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls tokenStore.deleteToken()", async () => {
    const deps = makeDeps();
    const deleteSpy = vi.spyOn(deps.tokenStore, "deleteToken");
    await handleLogout({ json: false }, deps);
    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it("does not throw when deleteToken resolves normally", async () => {
    const deps = makeDeps();
    await expect(handleLogout({ json: false }, deps)).resolves.not.toThrow();
  });

  it("with json: false calls log.success", async () => {
    const deps = makeDeps();
    await handleLogout({ json: false }, deps);
    expect(deps.log.success).toHaveBeenCalledOnce();
  });

  it("with json: true writes a JSON envelope containing command and success", async () => {
    const deps = makeDeps();
    await handleLogout({ json: true }, deps);
    expect(deps.write).toHaveBeenCalledOnce();
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as { command: string; success: boolean };
    expect(envelope.command).toBe("logout");
    expect(envelope.success).toBe(true);
  });
});
