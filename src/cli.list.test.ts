import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import { ListError, ManifestNotFoundError } from "./errors/cli-errors.js";
import type { ListResponse } from "./ports/list-client.js";
import { runCli } from "./cli.js";

const listManifest: AppPlatformManifest = {
  domain: { preview: "my-app.preview.example.com", production: "my-app.example.com" },
  environments: { preview: { branch: "preview" }, production: { branch: "main" } },
  name: "my-app",
  owner: "platform-engineering",
  resources: [],
  schemaVersion: "1",
  services: [],
  stack: "app",
};

const stubDeployments = [
  { deployedAt: "2026-01-01T00:00:00.000Z", deploymentId: "deploy-stub-001", state: "ACTIVE" },
];

const successReader = {
  readFile(_filePath: string) {
    return Promise.resolve("stack: app\n");
  },
};

const successValidator = (_yaml: string): PlatformManifest => listManifest;

const successListClient = {
  getList(_request: { environment: string; manifest: PlatformManifest }): Promise<ListResponse> {
    return Promise.resolve({
      deployments: stubDeployments,
      environment: "preview",
      name: "my-app",
    });
  },
};

const listDeps = (
  reader = successReader,
  validator = successValidator,
  listClient = successListClient,
) => ({
  cwd: "/workspace",
  deployClient: {
    deploy(_request: never): Promise<{ deploymentId: string; environment: string; name: string }> {
      return Promise.reject(new Error("deployClient not used in list tests"));
    },
  },
  filesystemWriter: {
    writeProject(_targetDirectory: never): Promise<void> {
      return Promise.reject(new Error("filesystemWriter not used in list tests"));
    },
  },
  layerResolver: {
    resolveLayers(_input: never): never {
      throw new Error("layerResolver not used in list tests");
    },
  },
  listClient,
  logsClient: {
    getLogs(_request: never): Promise<never> {
      return Promise.reject(new Error("logsClient not used in list tests"));
    },
  },
  observability: {
    error() {},
    track() {},
  },
  platformManifestGenerator: {
    generatePlatformManifest(_input: never): never {
      throw new Error("generatePlatformManifest not used in list tests");
    },
    validateManifest: validator,
  },
  projectReader: reader,
  promoteClient: {
    promote(
      _request: never,
    ): Promise<{ name: string; promotionId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("promoteClient not used in list tests"));
    },
  },
  promptPort: {
    promptForCreateInputs() {
      return Promise.resolve(null);
    },
  },
  registrationClient: {
    register(_manifest: never): Promise<{ name: string; registrationId: string }> {
      return Promise.reject(new Error("registrationClient not used in list tests"));
    },
  },
  rollbackClient: {
    rollback(
      _request: never,
    ): Promise<{ name: string; rollbackId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("rollbackClient not used in list tests"));
    },
  },
  statusClient: {
    getStatus(_request: never): Promise<never> {
      return Promise.reject(new Error("statusClient not used in list tests"));
    },
  },
  teardownClient: {
    teardown(_request: never): Promise<never> {
      return Promise.reject(new Error("teardownClient not used in list tests"));
    },
  },
  validator: {
    validateCreateInput(_input: never): never {
      throw new Error("validator not used in list tests");
    },
  },
});

describe("list", () => {
  it("exits 0 on successful list retrieval", async () => {
    const result = await runCli(["list"], listDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and deployment entries", async () => {
    const { output } = await runCli(["list"], listDeps());

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("deploy-stub-001");
  });

  it("reads platform.yaml from cwd when no directory argument is given", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await runCli(["list"], listDeps(trackingReader));

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

    await runCli(["list", "/some/project"], listDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits 11 when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    const result = await runCli(["list"], listDeps(missingReader));

    expect(result.exitCode).toBe(11);
  });

  it("exits 12 when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    const result = await runCli(["list"], listDeps(successReader, failingValidator));

    expect(result.exitCode).toBe(12);
  });

  it("exits 19 when list retrieval fails", async () => {
    const failingClient = {
      getList(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new ListError(request.manifest.name, "unavailable"));
      },
    };

    const result = await runCli(["list"], listDeps(successReader, successValidator, failingClient));

    expect(result.exitCode).toBe(19);
  });

  it("exits 1 when more than two arguments are provided", async () => {
    const result = await runCli(["list", "/dir", "preview", "extra"], listDeps());

    expect(result.exitCode).toBe(1);
  });

  it("exits 6 when environment is not preview or production", async () => {
    const result = await runCli(["list", "/dir", "staging"], listDeps());

    expect(result.exitCode).toBe(6);
  });

  it("defaults to the preview environment when no environment argument is given", async () => {
    const requests: { environment: string }[] = [];
    const trackingClient = {
      getList(request: { environment: string; manifest: PlatformManifest }): Promise<ListResponse> {
        requests.push(request);
        return Promise.resolve({
          deployments: stubDeployments,
          environment: request.environment,
          name: "my-app",
        });
      },
    };

    await runCli(["list"], listDeps(successReader, successValidator, trackingClient));

    expect(requests[0]?.environment).toBe("preview");
  });

  it("tracks list.start and list.success on successful retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };

    await runCli(["list"], { ...listDeps(), observability: trackingObservability });

    expect(trackedEvents).toContain("list.start");
    expect(trackedEvents).toContain("list.success");
  });

  it("tracks list.start and list.failure on a failed retrieval", async () => {
    const trackedEvents: string[] = [];
    const trackingObservability = {
      error() {},
      track(event: string) {
        trackedEvents.push(event);
      },
    };
    const failingClient = {
      getList(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new ListError(request.manifest.name, "unavailable"));
      },
    };

    await runCli(["list"], {
      ...listDeps(successReader, successValidator, failingClient),
      observability: trackingObservability,
    });

    expect(trackedEvents).toContain("list.start");
    expect(trackedEvents).toContain("list.failure");
  });

  it("does not change exit code when observability.track throws", async () => {
    const throwingObservability = {
      error() {},
      track() {
        throw new Error("o11y down");
      },
    };

    const result = await runCli(["list"], {
      ...listDeps(),
      observability: throwingObservability,
    });

    expect(result.exitCode).toBe(0);
  });
});
