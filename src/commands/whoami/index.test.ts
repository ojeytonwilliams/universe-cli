import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { CredentialError } from "../../errors/cli-errors.js";
import { EXIT_CREDENTIALS, EXIT_STORAGE } from "../../errors/exit-codes.js";
import { ProxyError } from "../../platform/proxy-client.port.js";
import type { ProxyClient } from "../../platform/proxy-client.port.js";
import { handleWhoami } from "./index.js";

const makeDeps = () => {
  const identityResolver: IdentityResolver = {
    resolve: vi.fn().mockResolvedValue({ source: "env_GITHUB_TOKEN", token: "token-abc" }),
  };
  const proxyClient: ProxyClient = {
    deployFinalize: vi.fn(),
    deployInit: vi.fn(),
    deployUpload: vi.fn(),
    siteDeploys: vi.fn(),
    sitePromote: vi.fn(),
    siteRollback: vi.fn(),
    whoami: vi
      .fn()
      .mockResolvedValue({ authorizedSites: ["site-a", "site-b"], login: "staffuser" }),
  };
  return {
    identityResolver,
    log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
    proxyClient,
    write: vi.fn(),
  };
};

describe(handleWhoami, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws CredentialError when identity resolves to null", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.identityResolver, "resolve").mockResolvedValue(null);
    await expect(handleWhoami({ json: false }, deps)).rejects.toThrow(CredentialError);
  });

  it("calls proxyClient.whoami()", async () => {
    const deps = makeDeps();
    const whoamiSpy = vi.spyOn(deps.proxyClient, "whoami");
    await handleWhoami({ json: false }, deps);
    expect(whoamiSpy).toHaveBeenCalledOnce();
  });

  it("with json: false prints login and authorized sites via log.info", async () => {
    const deps = makeDeps();
    await handleWhoami({ json: false }, deps);
    expect(deps.log.info).toHaveBeenCalledWith(expect.stringContaining("staffuser"));
    const calls = deps.log.info.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls.some((msg) => msg.includes("staffuser"))).toBe(true);
    expect(calls.some((msg) => msg.includes("site-a"))).toBe(true);
  });

  it("with json: true writes a JSON envelope with command and success", async () => {
    const deps = makeDeps();
    await handleWhoami({ json: true }, deps);
    expect(deps.write).toHaveBeenCalledOnce();
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as { command: string; success: boolean };
    expect(envelope.command).toBe("whoami");
    expect(envelope.success).toBe(true);
  });

  it("with json: true envelope contains login, authorizedSites, identitySource", async () => {
    const deps = makeDeps();
    await handleWhoami({ json: true }, deps);
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as {
      authorizedSites: string[];
      identitySource: string;
      login: string;
    };
    expect(envelope.login).toBe("staffuser");
    expect(envelope.authorizedSites).toStrictEqual(["site-a", "site-b"]);
    expect(envelope.identitySource).toBe("env_GITHUB_TOKEN");
  });

  it("proxyError from whoami propagates with correct exitCode", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.proxyClient, "whoami").mockRejectedValue(
      new ProxyError(401, "unauth", "bad token"),
    );
    const err = await handleWhoami({ json: false }, deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProxyError);
    expect((err as ProxyError).exitCode).toBe(EXIT_CREDENTIALS);
  });

  it("in JSON mode, emits error envelope via write before rethrowing", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.proxyClient, "whoami").mockRejectedValue(new ProxyError(503, "upstream", "down"));
    await expect(handleWhoami({ json: true }, deps)).rejects.toBeInstanceOf(ProxyError);
    expect(deps.write).toHaveBeenCalledOnce();
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as {
      success: boolean;
      error: { code: number; message: string };
    };
    expect(envelope.success).toBe(false);
    expect(envelope.error.code).toBe(EXIT_STORAGE);
    expect(envelope.error.message).toContain("down");
  });
});
