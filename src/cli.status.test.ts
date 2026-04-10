import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import { ManifestNotFoundError, StatusError } from "./errors/cli-errors.js";
import type { StatusResponse } from "./ports/status-client.js";
import { runCli } from "./cli.js";

const statusManifest: AppPlatformManifest = {
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

const successValidator = (_yaml: string): PlatformManifest => statusManifest;

const successStatusClient = {
  getStatus(_request: {
    environment: string;
    manifest: PlatformManifest;
  }): Promise<StatusResponse> {
    return Promise.resolve({
      environment: "preview",
      name: "my-app",
      state: "ACTIVE",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  },
};

const statusDeps = (
  reader = successReader,
  validator = successValidator,
  statusClient = successStatusClient,
) => ({
  cwd: "/workspace",
  deployClient: {
    deploy(_request: never): Promise<{ deploymentId: string; environment: string; name: string }> {
      return Promise.reject(new Error("deployClient not used in status tests"));
    },
  },
  filesystemWriter: {
    writeProject(_targetDirectory: never): Promise<void> {
      return Promise.reject(new Error("filesystemWriter not used in status tests"));
    },
  },
  layerResolver: {
    resolveLayers(_input: never): never {
      throw new Error("layerResolver not used in status tests");
    },
  },
  listClient: {
    getList(_request: never): Promise<never> {
      return Promise.reject(new Error("listClient not used in status tests"));
    },
  },
  logsClient: {
    getLogs(_request: never): Promise<never> {
      return Promise.reject(new Error("logsClient not used in status tests"));
    },
  },
  observability: {
    error() {},
    track() {},
  },
  platformManifestGenerator: {
    generatePlatformManifest(_input: never): never {
      throw new Error("generatePlatformManifest not used in status tests");
    },
    validateManifest: validator,
  },
  projectReader: reader,
  promoteClient: {
    promote(
      _request: never,
    ): Promise<{ name: string; promotionId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("promoteClient not used in status tests"));
    },
  },
  promptPort: {
    promptForCreateInputs() {
      return Promise.resolve(null);
    },
  },
  registrationClient: {
    register(_manifest: never): Promise<{ name: string; registrationId: string }> {
      return Promise.reject(new Error("registrationClient not used in status tests"));
    },
  },
  rollbackClient: {
    rollback(
      _request: never,
    ): Promise<{ name: string; rollbackId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("rollbackClient not used in status tests"));
    },
  },
  statusClient,
  validator: {
    validateCreateInput(_input: never): never {
      throw new Error("validator not used in status tests");
    },
  },
});

describe("status", () => {
  it("exits 0 on successful status retrieval", async () => {
    const result = await runCli(["status"], statusDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and state", async () => {
    const { output } = await runCli(["status"], statusDeps());

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("ACTIVE");
  });

  it("reads platform.yaml from cwd when no directory argument is given", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await runCli(["status"], statusDeps(trackingReader));

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

    await runCli(["status", "/some/project"], statusDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits 11 when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    const result = await runCli(["status"], statusDeps(missingReader));

    expect(result.exitCode).toBe(11);
  });

  it("exits 12 when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    const result = await runCli(["status"], statusDeps(successReader, failingValidator));

    expect(result.exitCode).toBe(12);
  });

  it("exits 18 when status retrieval fails", async () => {
    const failingClient = {
      getStatus(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new StatusError(request.manifest.name, "unavailable"));
      },
    };

    const result = await runCli(
      ["status"],
      statusDeps(successReader, successValidator, failingClient),
    );

    expect(result.exitCode).toBe(18);
  });

  it("exits 1 when more than two arguments are provided", async () => {
    const result = await runCli(["status", "/dir", "preview", "extra"], statusDeps());

    expect(result.exitCode).toBe(1);
  });

  it("exits 6 when environment is not preview or production", async () => {
    const result = await runCli(["status", "/dir", "staging"], statusDeps());

    expect(result.exitCode).toBe(6);
  });

  it("defaults to the preview environment when no environment argument is given", async () => {
    const requests: { environment: string }[] = [];
    const trackingClient = {
      getStatus(request: {
        environment: string;
        manifest: PlatformManifest;
      }): Promise<StatusResponse> {
        requests.push(request);
        return Promise.resolve({
          environment: request.environment,
          name: "my-app",
          state: "ACTIVE",
          updatedAt: "2026-01-01T00:00:00.000Z",
        });
      },
    };

    await runCli(["status"], statusDeps(successReader, successValidator, trackingClient));

    expect(requests[0]?.environment).toBe("preview");
  });

  it("tracks status.start and status.success on successful retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };

    await runCli(["status"], { ...statusDeps(), observability: trackingObservability });

    expect(trackedEvents).toContain("status.start");
    expect(trackedEvents).toContain("status.success");
  });

  it("tracks status.start and status.failure on a failed retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };
    const failingClient = {
      getStatus(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new StatusError(request.manifest.name, "unavailable"));
      },
    };

    await runCli(["status"], {
      ...statusDeps(successReader, successValidator, failingClient),
      observability: trackingObservability,
    });

    expect(trackedEvents).toContain("status.start");
    expect(trackedEvents).toContain("status.failure");
  });

  it("does not change exit code when observability.track throws", async () => {
    const throwingObservability = {
      error() {},
      track() {
        throw new Error("o11y down");
      },
    };

    const result = await runCli(["status"], {
      ...statusDeps(),
      observability: throwingObservability,
    });

    expect(result.exitCode).toBe(0);
  });
});
