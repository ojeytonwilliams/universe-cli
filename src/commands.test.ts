import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import {
  ListError,
  LogsError,
  ManifestInvalidError,
  ManifestNotFoundError,
  StatusError,
  TeardownError,
} from "./errors/cli-errors.js";
import type { ListResponse } from "./ports/list-client.js";
import type { StatusResponse } from "./ports/status-client.js";
import type { TeardownReceipt } from "./ports/teardown-client.js";
import { handleCreate, handleList, handleLogs, handleStatus, handleTeardown } from "./commands.js";

const stubManifest: AppPlatformManifest = {
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

const successValidator = (_yaml: string): PlatformManifest => stubManifest;

// --- handleCreate ---

describe(handleCreate, () => {
  it("returns non-zero when prompt flow is cancelled", async () => {
    const deps = {
      adapters: {
        filesystemWriter: {
          writeProject(_targetDirectory: never): Promise<void> {
            return Promise.reject(new Error("filesystemWriter not used in this test"));
          },
        },
        promptPort: {
          promptForCreateInputs() {
            return Promise.resolve(null);
          },
        },
      },
      services: {
        layerResolver: {
          resolveLayers(_input: never): never {
            throw new Error("layerResolver not used in this test");
          },
        },
        platformManifestGenerator: {
          generatePlatformManifest(_input: never): never {
            throw new Error("generatePlatformManifest not used in this test");
          },
          validateManifest(_yaml: never): never {
            throw new Error("validateManifest not used in this test");
          },
        },
        validator: {
          validateCreateInput(_input: never): never {
            throw new Error("validator not used in this test");
          },
        },
      },
    };

    const result = await handleCreate(["create"], "/workspace", deps);

    expect(result.exitCode).toBe(1);
  });
});

// --- handleList ---

const stubDeployments = [
  { deployedAt: "2026-01-01T00:00:00.000Z", deploymentId: "deploy-stub-001", state: "ACTIVE" },
];

const successListClient = {
  getList(_request: { manifest: PlatformManifest }): Promise<ListResponse> {
    return Promise.resolve({ deployments: stubDeployments, name: "my-app" });
  },
};

const listDeps = (
  reader = successReader,
  validator = successValidator,
  listClient = successListClient,
) => ({
  adapters: { listClient, projectReader: reader },
  services: {
    platformManifestGenerator: {
      generatePlatformManifest(_input: never): never {
        throw new Error("generatePlatformManifest not used in list tests");
      },
      validateManifest: validator,
    },
  },
});

describe(handleList, () => {
  it("exits 0 on successful list retrieval", async () => {
    const result = await handleList(["list"], "/workspace", listDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and deployment entries", async () => {
    const { output } = await handleList(["list"], "/workspace", listDeps());

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

    await handleList(["list"], "/workspace", listDeps(trackingReader));

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

    await handleList(["list", "/some/project"], "/workspace", listDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(handleList(["list"], "/workspace", listDeps(missingReader))).rejects.toThrow(
      ManifestNotFoundError,
    );
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleList(["list"], "/workspace", listDeps(successReader, failingValidator)),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when list retrieval fails", async () => {
    const failingClient = {
      getList(request: { manifest: PlatformManifest }) {
        return Promise.reject(new ListError(request.manifest.name, "unavailable"));
      },
    };

    await expect(
      handleList(["list"], "/workspace", listDeps(successReader, successValidator, failingClient)),
    ).rejects.toThrow(ListError);
  });
});

// --- handleLogs ---

const stubLogEntries = [
  { level: "info", message: "Application started", timestamp: "2026-01-01T00:00:00.000Z" },
];

const successLogsClient = {
  getLogs(_request: { environment: string; manifest: PlatformManifest }) {
    return Promise.resolve({ entries: stubLogEntries, environment: "preview", name: "my-app" });
  },
};

const logsDeps = (
  reader = successReader,
  validator = successValidator,
  logsClient = successLogsClient,
) => ({
  adapters: { logsClient, projectReader: reader },
  services: {
    platformManifestGenerator: {
      generatePlatformManifest(_input: never): never {
        throw new Error("generatePlatformManifest not used in logs tests");
      },
      validateManifest: validator,
    },
  },
});

describe(handleLogs, () => {
  it("exits 0 on successful log retrieval", async () => {
    const result = await handleLogs(["logs"], "/workspace", logsDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and log entries", async () => {
    const { output } = await handleLogs(["logs"], "/workspace", logsDeps());

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

    await handleLogs(["logs"], "/workspace", logsDeps(trackingReader));

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

    await handleLogs(["logs", "/some/project"], "/workspace", logsDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(handleLogs(["logs"], "/workspace", logsDeps(missingReader))).rejects.toThrow(
      ManifestNotFoundError,
    );
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleLogs(["logs"], "/workspace", logsDeps(successReader, failingValidator)),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when log retrieval fails", async () => {
    const failingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new LogsError(request.manifest.name, "timeout"));
      },
    };

    await expect(
      handleLogs(["logs"], "/workspace", logsDeps(successReader, successValidator, failingClient)),
    ).rejects.toThrow(LogsError);
  });
});

// --- handleStatus ---

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
  adapters: { projectReader: reader, statusClient },
  services: {
    platformManifestGenerator: {
      generatePlatformManifest(_input: never): never {
        throw new Error("generatePlatformManifest not used in status tests");
      },
      validateManifest: validator,
    },
  },
});

describe(handleStatus, () => {
  it("exits 0 on successful status retrieval", async () => {
    const result = await handleStatus(["status"], "/workspace", statusDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and state", async () => {
    const { output } = await handleStatus(["status"], "/workspace", statusDeps());

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

    await handleStatus(["status"], "/workspace", statusDeps(trackingReader));

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

    await handleStatus(["status", "/some/project"], "/workspace", statusDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(handleStatus(["status"], "/workspace", statusDeps(missingReader))).rejects.toThrow(
      ManifestNotFoundError,
    );
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleStatus(["status"], "/workspace", statusDeps(successReader, failingValidator)),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when status retrieval fails", async () => {
    const failingClient = {
      getStatus(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new StatusError(request.manifest.name, "unavailable"));
      },
    };

    await expect(
      handleStatus(
        ["status"],
        "/workspace",
        statusDeps(successReader, successValidator, failingClient),
      ),
    ).rejects.toThrow(StatusError);
  });
});

// --- handleTeardown ---

const successTeardownClient = {
  teardown(_request: { manifest: PlatformManifest }): Promise<TeardownReceipt> {
    return Promise.resolve({ name: "my-app", teardownId: "stub-teardown-my-app-1" });
  },
};

const teardownDeps = (
  reader = successReader,
  validator = successValidator,
  teardownClient = successTeardownClient,
) => ({
  adapters: { projectReader: reader, teardownClient },
  services: {
    platformManifestGenerator: {
      generatePlatformManifest(_input: never): never {
        throw new Error("generatePlatformManifest not used in teardown tests");
      },
      validateManifest: validator,
    },
  },
});

describe(handleTeardown, () => {
  it("exits 0 on successful teardown", async () => {
    const result = await handleTeardown(["teardown"], "/workspace", teardownDeps());

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name and teardown ID", async () => {
    const { output } = await handleTeardown(["teardown"], "/workspace", teardownDeps());

    expect(output).toContain("my-app");
    expect(output).toContain("stub-teardown-my-app-1");
  });

  it("reads platform.yaml from cwd when no directory argument is given", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleTeardown(["teardown"], "/workspace", teardownDeps(trackingReader));

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

    await handleTeardown(["teardown", "/some/project"], "/workspace", teardownDeps(trackingReader));

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleTeardown(["teardown"], "/workspace", teardownDeps(missingReader)),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleTeardown(["teardown"], "/workspace", teardownDeps(successReader, failingValidator)),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when teardown fails", async () => {
    const failingClient = {
      teardown(request: { manifest: PlatformManifest }) {
        return Promise.reject(new TeardownError(request.manifest.name, "unavailable"));
      },
    };

    await expect(
      handleTeardown(
        ["teardown"],
        "/workspace",
        teardownDeps(successReader, successValidator, failingClient),
      ),
    ).rejects.toThrow(TeardownError);
  });
});
