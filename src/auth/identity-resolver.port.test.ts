import type {
  IdentityResolver,
  IdentitySource,
  ResolvedIdentity,
} from "./identity-resolver.port.js";

describe("identity-resolver port", () => {
  it("is implementable with a conforming object", async () => {
    const resolver: IdentityResolver = {
      resolve: () => Promise.resolve(null),
    };
    await expect(resolver.resolve()).resolves.toBeNull();
  });

  it("resolvedIdentity holds token and source", () => {
    const id: ResolvedIdentity = { source: "env_GITHUB_TOKEN", token: "ghp_x" };
    expect(id.token).toBe("ghp_x");
  });

  it("identitySource covers all expected values", () => {
    const sources: IdentitySource[] = ["env_GITHUB_TOKEN", "env_GH_TOKEN", "gh_cli", "device_flow"];
    expect(sources).toHaveLength(4);
  });
});
