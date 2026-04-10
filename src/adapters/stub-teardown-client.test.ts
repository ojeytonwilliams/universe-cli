import type { AppPlatformManifest } from "../services/platform-manifest-service.js";
import { TeardownError } from "../errors/cli-errors.js";
import { StubTeardownClient } from "./stub-teardown-client.js";

const appManifest: AppPlatformManifest = {
  domain: { preview: "my-app.preview.example.com", production: "my-app.example.com" },
  environments: { preview: { branch: "preview" }, production: { branch: "main" } },
  name: "my-app",
  owner: "platform-engineering",
  resources: [],
  schemaVersion: "1",
  services: [],
  stack: "app",
};

describe(StubTeardownClient, () => {
  it("returns teardownId stub-teardown-<name>-<target>-1 on the first teardown", async () => {
    const client = new StubTeardownClient();

    const receipt = await client.teardown({
      manifest: appManifest,
      targetEnvironment: "preview",
    });

    expect(receipt.teardownId).toBe("stub-teardown-my-app-preview-1");
  });

  it("returns the project name and targetEnvironment in the receipt", async () => {
    const client = new StubTeardownClient();

    const receipt = await client.teardown({
      manifest: appManifest,
      targetEnvironment: "preview",
    });

    expect(receipt.name).toBe("my-app");
    expect(receipt.targetEnvironment).toBe("preview");
  });

  it("increments the sequence number on repeated teardowns for the same project and target", async () => {
    const client = new StubTeardownClient();

    await client.teardown({ manifest: appManifest, targetEnvironment: "preview" });
    const second = await client.teardown({
      manifest: appManifest,
      targetEnvironment: "preview",
    });

    expect(second.teardownId).toBe("stub-teardown-my-app-preview-2");
  });

  it("maintains independent counters per target environment", async () => {
    const client = new StubTeardownClient();

    const preview = await client.teardown({
      manifest: appManifest,
      targetEnvironment: "preview",
    });
    const production = await client.teardown({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(preview.teardownId).toBe("stub-teardown-my-app-preview-1");
    expect(production.teardownId).toBe("stub-teardown-my-app-production-1");
  });

  it("rejects with TeardownError for the sentinel failure project name", async () => {
    const client = new StubTeardownClient();
    const failureManifest = { ...appManifest, name: "teardown-failure" };

    await expect(
      client.teardown({ manifest: failureManifest, targetEnvironment: "preview" }),
    ).rejects.toThrow(TeardownError);
  });

  it("resets state between instances", async () => {
    const first = new StubTeardownClient();
    await first.teardown({ manifest: appManifest, targetEnvironment: "preview" });

    const second = new StubTeardownClient();
    const receipt = await second.teardown({
      manifest: appManifest,
      targetEnvironment: "preview",
    });

    expect(receipt.teardownId).toBe("stub-teardown-my-app-preview-1");
  });
});
