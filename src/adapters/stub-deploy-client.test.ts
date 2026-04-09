import type { AppPlatformManifest } from "../services/platform-manifest-service.js";
import { DeploymentError } from "../errors/cli-errors.js";
import { StubDeployClient } from "./stub-deploy-client.js";

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

describe(StubDeployClient, () => {
  it("returns deploymentId stub-<name>-<environment>-1 on the first deploy", async () => {
    const client = new StubDeployClient();

    const receipt = await client.deploy({ environment: "preview", manifest: appManifest });

    expect(receipt.deploymentId).toBe("stub-my-app-preview-1");
  });

  it("returns the project name and environment in the receipt", async () => {
    const client = new StubDeployClient();

    const receipt = await client.deploy({ environment: "preview", manifest: appManifest });

    expect(receipt.name).toBe("my-app");
    expect(receipt.environment).toBe("preview");
  });

  it("increments the sequence number on repeated deploys for the same project and environment", async () => {
    const client = new StubDeployClient();

    await client.deploy({ environment: "preview", manifest: appManifest });
    const second = await client.deploy({ environment: "preview", manifest: appManifest });

    expect(second.deploymentId).toBe("stub-my-app-preview-2");
  });

  it("maintains independent counters per environment", async () => {
    const client = new StubDeployClient();

    const preview = await client.deploy({ environment: "preview", manifest: appManifest });
    const production = await client.deploy({ environment: "production", manifest: appManifest });

    expect(preview.deploymentId).toBe("stub-my-app-preview-1");
    expect(production.deploymentId).toBe("stub-my-app-production-1");
  });

  it("rejects with DeploymentError for the sentinel failure project name", async () => {
    const client = new StubDeployClient();
    const failureManifest = { ...appManifest, name: "deploy-failure" };

    await expect(
      client.deploy({ environment: "preview", manifest: failureManifest }),
    ).rejects.toThrow(DeploymentError);
  });

  it("resets state between instances", async () => {
    const first = new StubDeployClient();
    await first.deploy({ environment: "preview", manifest: appManifest });

    const second = new StubDeployClient();
    const receipt = await second.deploy({ environment: "preview", manifest: appManifest });

    expect(receipt.deploymentId).toBe("stub-my-app-preview-1");
  });
});
