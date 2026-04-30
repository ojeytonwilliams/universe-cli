import type { TokenStore } from "../../auth/token-store.port.js";
import { handleLogout } from "./index.js";

const makeDeps = () => {
  const tokenStore = {
    deleteToken: vi.fn().mockResolvedValue(undefined),
    loadToken: vi.fn().mockResolvedValue("existing-token"),
    saveToken: vi.fn(),
  } satisfies TokenStore;
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

  it("deletes the existing token", async () => {
    const deps = makeDeps();
    const deleteSpy = vi.spyOn(deps.tokenStore, "deleteToken");
    await handleLogout({ json: false }, deps);
    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it("reports 'no token' when nothing was stored (text mode)", async () => {
    const deps = makeDeps();
    deps.tokenStore.loadToken.mockResolvedValue(null);
    await handleLogout({ json: false }, deps);
    expect(deps.log.info).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/no token/i));
  });

  it("with json: true writes a JSON envelope containing command, success and removed", async () => {
    const deps = makeDeps();
    await handleLogout({ json: true }, deps);
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as { command: string; success: boolean };

    expect(envelope).toMatchObject({ command: "logout", removed: true, success: true });
  });

  it("emits removed=false when no token existed (JSON mode)", async () => {
    const deps = makeDeps();
    deps.tokenStore.loadToken.mockResolvedValue(null);
    await handleLogout({ json: true }, deps);
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as { removed?: boolean };

    expect(envelope.removed).toBe(false);
  });
});
