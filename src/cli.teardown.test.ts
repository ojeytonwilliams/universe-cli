import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import { ManifestNotFoundError, TeardownError } from "./errors/cli-errors.js";
import type { TeardownReceipt } from "./ports/teardown-client.js";
import { runCli } from "./cli.js";

const teardownManifest: AppPlatformManifest = {
  domain: { preview: "my-app.preview.example.com", production: "my-app.example.com" },
  environments: { preview: { branch: "preview" }, production: { branch: "main" } },
  name: "my-app",
  owner: "platform-engineering",
  resources: [],
  schemaVersion: "1",
  services: [],
  stack: "app",
};

const successReader = {
  readFile(_filePath: string) {
    return Promise.resolve("stack: app\n");
  },
};

const successValidator = (_yaml: string): PlatformManifest => teardownManifest;

const successTeardownClient = {
  teardown(_request: {
    manifest: PlatformManifest;
    targetEnvironment: string;
  }): Promise<TeardownReceipt> {
    return Promise.resolve({
      name: "my-app",
      targetEnvironment: "preview",
      teardownId: "stub-teardown-my-app-preview-1",
    });
  },
};

const teardownDeps = (
  reader = successReader,
  validator = successValidator,
  teardownClient = successTeardownClient,
) => ({
  cwd: "/workspace",
  deployClient: {
    deploy(_request: never): Promise<{ deploymentId: string; environment: string; name: string }> {
      return Promise.reject(new Error("deployClient not used in teardown tests"));
    },
  },
  filesystemWriter: {
    writeProject(_targetDirectory: never): Promise<void> {
      return Promise.reject(new Error("filesystemWriter not used in teardown tests"));
    },
  },
  layerResolver: {
    resolveLayers(_input: never): never {
      throw new Error("layerResolver not used in teardown tests");
    },
  },
  listClient: {
    getList(_request: never): Promise<never> {
      return Promise.reject(new Error("listClient not used in teardown tests"));
    },
  },
  logsClient: {
    getLogs(_request: never): Promise<never> {
      return Promise.reject(new Error("logsClient not used in teardown tests"));
    },
  },
  observability: {
    error() {},
    track() {},
  },
  platformManifestGenerator: {
    generatePlatformManifest(_input: never): never {
      throw new Error("generatePlatformManifest not used in teardown tests");
    },
    validateManifest: validator,
  },
  projectReader: reader,
  promoteClient: {
    promote(
      _request: never,
    ): Promise<{ name: string; promotionId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("promoteClient not used in teardown tests"));
    },
  },
  promptPort: {
    promptForCreateInputs() {
      return Promise.resolve(null);
    },
  },
  registrationClient: {
    register(_manifest: never): Promise<{ name: string; registrationId: string }> {
      return Promise.reject(new Error("registrationClient not used in teardown tests"));
    },
  },
  rollbackClient: {
    rollback(
      _request: never,
    ): Promise<{ name: string; rollbackId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("rollbackClient not used in teardown tests"));
    },
  },
  statusClient: {
    getStatus(_request: never): Promise<never> {
      return Promise.reject(new Error("statusClient not used in teardown tests"));
    },
  },
  teardownClient,
  validator: {
    validateCreateInput(_input: never): never {
      throw new Error("validator not used in teardown tests");
    },
  },
});

describe("teardown", () => {
  it("exits 0 on successful teardown", async () => {
    const result = await runCli(["teardown"], teardownDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and teardown ID", async () => {
    const { output } = await runCli(["teardown"], teardownDeps());

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("stub-teardown-my-app-preview-1");
  });

  it("reads platform.yaml from cwd when no directory argument is given", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await runCli(["teardown"], teardownDeps(trackingReader));

    expect(paths[0]).toBe("/workspace/platform.yaml");
  });

  it("reads platform.yaml from the given directory argument", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await runCli(["teardown", "/some/project"], teardownDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    const result = await runCli(["teardown"], teardownDeps(missingReader));

    expect(result.exitCode).toBe(8);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    const result = await runCli(["teardown"], teardownDeps(successReader, failingValidator));

    expect(result.exitCode).toBe(8);
  });

  it("exits when teardown fails", async () => {
    const failingClient = {
      teardown(request: { manifest: PlatformManifest; targetEnvironment: string }) {
        return Promise.reject(new TeardownError(request.manifest.name, "unavailable"));
      },
    };

    const result = await runCli(
      ["teardown"],
      teardownDeps(successReader, successValidator, failingClient),
    );

    expect(result.exitCode).toBe(16);
  });

  it("exits when more than two arguments are provided", async () => {
    const result = await runCli(["teardown", "/dir", "preview", "extra"], teardownDeps());

    expect(result.exitCode).toBe(1);
  });

  it("exits when environment is not preview or production", async () => {
    const result = await runCli(["teardown", "/dir", "staging"], teardownDeps());

    expect(result.exitCode).toBe(4);
  });

  it("defaults to the preview environment when no environment argument is given", async () => {
    const requests: { targetEnvironment: string }[] = [];
    const trackingClient = {
      teardown(request: {
        manifest: PlatformManifest;
        targetEnvironment: string;
      }): Promise<TeardownReceipt> {
        requests.push(request);
        return Promise.resolve({
          name: "my-app",
          targetEnvironment: request.targetEnvironment,
          teardownId: `stub-teardown-my-app-${request.targetEnvironment}-1`,
        });
      },
    };

    await runCli(["teardown"], teardownDeps(successReader, successValidator, trackingClient));

    expect(requests[0]?.targetEnvironment).toBe("preview");
  });

  it("tracks teardown.start and teardown.success on successful teardown", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };

    await runCli(["teardown"], { ...teardownDeps(), observability: trackingObservability });

    expect(trackedEvents).toContain("teardown.start");
    expect(trackedEvents).toContain("teardown.success");
  });

  it("tracks teardown.start and teardown.failure on a failed teardown", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };
    const failingClient = {
      teardown(request: { manifest: PlatformManifest; targetEnvironment: string }) {
        return Promise.reject(new TeardownError(request.manifest.name, "unavailable"));
      },
    };

    await runCli(["teardown"], {
      ...teardownDeps(successReader, successValidator, failingClient),
      observability: trackingObservability,
    });

    expect(trackedEvents).toContain("teardown.start");
    expect(trackedEvents).toContain("teardown.failure");
  });

  it("does not change exit code when observability.track throws", async () => {
    const throwingObservability = {
      error() {},
      track() {
        throw new Error("o11y down");
      },
    };

    const result = await runCli(["teardown"], {
      ...teardownDeps(),
      observability: throwingObservability,
    });

    expect(result.exitCode).toBe(0);
  });
});
