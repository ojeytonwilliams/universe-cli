import type { AppPlatformManifest } from "../services/platform-manifest-service.js";
import { RollbackError } from "../errors/cli-errors.js";
import { StubRollbackClient } from "./stub-rollback-client.js";

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

describe(StubRollbackClient, () => {
  it("returns rollbackId stub-rollback-<name>-<target>-1 on the first rollback", async () => {
    const client = new StubRollbackClient();

    const receipt = await client.rollback({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(receipt.rollbackId).toBe("stub-rollback-my-app-production-1");
  });

  it("returns the project name and targetEnvironment in the receipt", async () => {
    const client = new StubRollbackClient();

    const receipt = await client.rollback({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(receipt.name).toBe("my-app");
    expect(receipt.targetEnvironment).toBe("production");
  });

  it("increments the sequence number on repeated rollbacks for the same project and target", async () => {
    const client = new StubRollbackClient();

    await client.rollback({ manifest: appManifest, targetEnvironment: "production" });
    const second = await client.rollback({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(second.rollbackId).toBe("stub-rollback-my-app-production-2");
  });

  it("maintains independent counters per target environment", async () => {
    const client = new StubRollbackClient();

    const preview = await client.rollback({ manifest: appManifest, targetEnvironment: "preview" });
    const production = await client.rollback({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(preview.rollbackId).toBe("stub-rollback-my-app-preview-1");
    expect(production.rollbackId).toBe("stub-rollback-my-app-production-1");
  });

  it("rejects with RollbackError for the sentinel failure project name", async () => {
    const client = new StubRollbackClient();
    const failureManifest = { ...appManifest, name: "rollback-failure" };

    await expect(
      client.rollback({ manifest: failureManifest, targetEnvironment: "production" }),
    ).rejects.toThrow(RollbackError);
  });

  it("resets state between instances", async () => {
    const first = new StubRollbackClient();
    await first.rollback({ manifest: appManifest, targetEnvironment: "production" });

    const second = new StubRollbackClient();
    const receipt = await second.rollback({
      manifest: appManifest,
      targetEnvironment: "production",
    });

    expect(receipt.rollbackId).toBe("stub-rollback-my-app-production-1");
  });
});
