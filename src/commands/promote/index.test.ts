import type { IdentityResolver } from "../../auth/identity-resolver.port.js";
import { ConfigError, CredentialError } from "../../errors/cli-errors.js";
import { EXIT_CREDENTIALS, EXIT_STORAGE } from "../../errors/exit-codes.js";
import { ProxyError } from "../../platform/proxy-client.port.js";
import type { ProxyClient } from "../../platform/proxy-client.port.js";
import { handlePromote } from "./index.js";

const PLATFORM_YAML = "site: my-site\n";

const makeDeps = () => {
  const identityResolver: IdentityResolver = {
    resolve: vi.fn().mockResolvedValue({ source: "env_GITHUB_TOKEN", token: "token-abc" }),
  };
  const proxyClient: ProxyClient = {
    deployFinalize: vi.fn(),
    deployInit: vi.fn(),
    deployUpload: vi.fn(),
    siteDeploys: vi.fn(),
    sitePromote: vi.fn().mockResolvedValue({ deployId: "d1", url: "https://my-site.pages.dev" }),
    siteRollback: vi.fn(),
    whoami: vi.fn(),
  };
  return {
    identityResolver,
    log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
    proxyClient,
    readFile: vi.fn().mockResolvedValue(PLATFORM_YAML),
    write: vi.fn(),
  };
};

describe(handlePromote, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws CredentialError when identity resolves to null", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.identityResolver, "resolve").mockResolvedValue(null);
    await expect(handlePromote({ cwd: "/proj", json: false }, deps)).rejects.toThrow(
      CredentialError,
    );
  });

  it("throws ConfigError when platform.yaml cannot be read", async () => {
    const deps = makeDeps();
    vi.spyOn(deps, "readFile").mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    await expect(handlePromote({ cwd: "/proj", json: false }, deps)).rejects.toThrow(ConfigError);
  });

  it("throws ConfigError when platform.yaml is invalid", async () => {
    const deps = makeDeps();
    vi.spyOn(deps, "readFile").mockResolvedValue("- not: a mapping");
    await expect(handlePromote({ cwd: "/proj", json: false }, deps)).rejects.toThrow(ConfigError);
  });

  it("calls sitePromote with the site name from platform.yaml", async () => {
    const deps = makeDeps();
    const promoteSpy = vi.spyOn(deps.proxyClient, "sitePromote");
    await handlePromote({ cwd: "/proj", json: false }, deps);
    expect(promoteSpy).toHaveBeenCalledWith({ site: "my-site" });
  });

  it("with json: false calls log.success", async () => {
    const deps = makeDeps();
    await handlePromote({ cwd: "/proj", json: false }, deps);
    expect(deps.log.success).toHaveBeenCalledOnce();
  });

  it("with json: true writes a JSON envelope containing command and success", async () => {
    const deps = makeDeps();
    await handlePromote({ cwd: "/proj", json: true }, deps);
    expect(deps.write).toHaveBeenCalledOnce();
    const text = deps.write.mock.calls[0]![0] as string;
    const envelope = JSON.parse(text) as { command: string; success: boolean };
    expect(envelope.command).toBe("static promote");
    expect(envelope.success).toBe(true);
  });

  it("--from flag routes through siteRollback instead of sitePromote", async () => {
    const deps = makeDeps();
    const rollbackSpy = vi.spyOn(deps.proxyClient, "siteRollback").mockResolvedValue({
      deployId: "old-d1",
      url: "https://my-site.pages.dev",
    });
    const promoteSpy = vi.spyOn(deps.proxyClient, "sitePromote");
    await handlePromote({ cwd: "/proj", from: "old-d1", json: false }, deps);
    expect(rollbackSpy).toHaveBeenCalledWith({ site: "my-site", to: "old-d1" });
    expect(promoteSpy).not.toHaveBeenCalled();
  });

  it("proxyError 422 from sitePromote propagates with EXIT_STORAGE exitCode", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.proxyClient, "sitePromote").mockRejectedValue(
      new ProxyError(422, "no_preview", "no preview alias"),
    );
    const err = await handlePromote({ cwd: "/proj", json: false }, deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProxyError);
    expect((err as ProxyError).exitCode).toBe(EXIT_STORAGE);
  });

  it("proxyError 403 from sitePromote propagates with EXIT_CREDENTIALS exitCode", async () => {
    const deps = makeDeps();
    vi.spyOn(deps.proxyClient, "sitePromote").mockRejectedValue(
      new ProxyError(403, "user_unauthorized", "no team"),
    );
    const err = await handlePromote({ cwd: "/proj", json: false }, deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProxyError);
    expect((err as ProxyError).exitCode).toBe(EXIT_CREDENTIALS);
  });
});
