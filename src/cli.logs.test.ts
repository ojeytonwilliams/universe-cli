import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import { LogsError, ManifestNotFoundError } from "./errors/cli-errors.js";
import { runCli } from "./cli.js";

const logsManifest: AppPlatformManifest = {
  domain: { preview: "my-app.preview.example.com", production: "my-app.example.com" },
  environments: { preview: { branch: "preview" }, production: { branch: "main" } },
  name: "my-app",
  owner: "platform-engineering",
  resources: [],
  schemaVersion: "1",
  services: [],
  stack: "app",
};

const stubEntries = [
  { level: "info", message: "Application started", timestamp: "2026-01-01T00:00:00.000Z" },
];

const successReader = {
  readFile(_filePath: string) {
    return Promise.resolve("stack: app\n");
  },
};

const successValidator = (_yaml: string): PlatformManifest => logsManifest;

const successLogsClient = {
  getLogs(_request: { environment: string; manifest: PlatformManifest }) {
    return Promise.resolve({
      entries: stubEntries,
      environment: "preview",
      name: "my-app",
    });
  },
};

const logsDeps = (
  reader = successReader,
  validator = successValidator,
  logsClient = successLogsClient,
) => ({
  cwd: "/workspace",
  deployClient: {
    deploy(_request: never): Promise<{ deploymentId: string; environment: string; name: string }> {
      return Promise.reject(new Error("deployClient not used in logs tests"));
    },
  },
  filesystemWriter: {
    writeProject(_targetDirectory: never): Promise<void> {
      return Promise.reject(new Error("filesystemWriter not used in logs tests"));
    },
  },
  layerResolver: {
    resolveLayers(_input: never): never {
      throw new Error("layerResolver not used in logs tests");
    },
  },
  logsClient,
  observability: {
    error() {},
    track() {},
  },
  platformManifestGenerator: {
    generatePlatformManifest(_input: never): never {
      throw new Error("generatePlatformManifest not used in logs tests");
    },
    validateManifest: validator,
  },
  projectReader: reader,
  promoteClient: {
    promote(
      _request: never,
    ): Promise<{ name: string; promotionId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("promoteClient not used in logs tests"));
    },
  },
  promptPort: {
    promptForCreateInputs() {
      return Promise.resolve(null);
    },
  },
  registrationClient: {
    register(_manifest: never): Promise<{ name: string; registrationId: string }> {
      return Promise.reject(new Error("registrationClient not used in logs tests"));
    },
  },
  rollbackClient: {
    rollback(
      _request: never,
    ): Promise<{ name: string; rollbackId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("rollbackClient not used in logs tests"));
    },
  },
  validator: {
    validateCreateInput(_input: never): never {
      throw new Error("validator not used in logs tests");
    },
  },
});

describe("logs", () => {
  it("exits 0 on successful log retrieval", async () => {
    const result = await runCli(["logs"], logsDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and log entries", async () => {
    const { output } = await runCli(["logs"], logsDeps());

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("Application started");
  });

  it("reads platform.yaml from cwd when no directory argument is given", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await runCli(["logs"], logsDeps(trackingReader));

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

    await runCli(["logs", "/some/project"], logsDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits 11 when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    const result = await runCli(["logs"], logsDeps(missingReader));

    expect(result.exitCode).toBe(11);
  });

  it("exits 12 when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    const result = await runCli(["logs"], logsDeps(successReader, failingValidator));

    expect(result.exitCode).toBe(12);
  });

  it("exits 17 when log retrieval fails", async () => {
    const failingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new LogsError(request.manifest.name, "timeout"));
      },
    };

    const result = await runCli(["logs"], logsDeps(successReader, successValidator, failingClient));

    expect(result.exitCode).toBe(17);
  });

  it("exits 1 when more than two arguments are provided", async () => {
    const result = await runCli(["logs", "/dir", "preview", "extra"], logsDeps());

    expect(result.exitCode).toBe(1);
  });

  it("exits 6 when environment is not preview or production", async () => {
    const result = await runCli(["logs", "/dir", "staging"], logsDeps());

    expect(result.exitCode).toBe(6);
  });

  it("defaults to the preview environment when no environment argument is given", async () => {
    const requests: { environment: string }[] = [];
    const trackingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        requests.push(request);
        return Promise.resolve({
          entries: stubEntries,
          environment: request.environment,
          name: "my-app",
        });
      },
    };

    await runCli(["logs"], logsDeps(successReader, successValidator, trackingClient));

    expect(requests[0]?.environment).toBe("preview");
  });

  it("tracks logs.start and logs.success on successful retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };

    await runCli(["logs"], { ...logsDeps(), observability: trackingObservability });

    expect(trackedEvents).toContain("logs.start");
    expect(trackedEvents).toContain("logs.success");
  });

  it("tracks logs.start and logs.failure on a failed retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };
    const failingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new LogsError(request.manifest.name, "timeout"));
      },
    };

    await runCli(["logs"], {
      ...logsDeps(successReader, successValidator, failingClient),
      observability: trackingObservability,
    });

    expect(trackedEvents).toContain("logs.start");
    expect(trackedEvents).toContain("logs.failure");
  });

  it("does not change exit code when observability.track throws", async () => {
    const throwingObservability = {
      error() {},
      track() {
        throw new Error("o11y down");
      },
    };

    const result = await runCli(["logs"], {
      ...logsDeps(),
      observability: throwingObservability,
    });

    expect(result.exitCode).toBe(0);
  });
});
