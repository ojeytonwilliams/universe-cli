// oxlint-disable max-lines
import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import {
  DeploymentError,
  InvalidNameError,
  ListError,
  LogsError,
  ManifestInvalidError,
  ManifestNotFoundError,
  PromotionError,
  RegistrationError,
  RollbackError,
  ScaffoldWriteError,
  StatusError,
  TeardownError,
} from "./errors/cli-errors.js";
import type { ListResponse } from "./ports/list-client.js";
import type { CreateSelections } from "./ports/prompt-port.js";
import type { StatusResponse } from "./ports/status-client.js";
import type { TeardownReceipt } from "./ports/teardown-client.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import {
  handleCreate,
  handleDeploy,
  handleList,
  handleLogs,
  handlePromote,
  handleRegister,
  handleRollback,
  handleStatus,
  handleTeardown,
} from "./commands.js";

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

const getDeps = <T extends object>(
  adapters: T,
  reader = successReader,
  validator = successValidator,
) => ({
  adapters: { projectReader: reader, ...adapters },
  services: {
    platformManifestGenerator: {
      generatePlatformManifest(_input: never): never {
        throw new Error("generatePlatformManifest not used");
      },
      validateManifest: validator,
    },
  },
});

const createPromptResult: CreateSelections = {
  confirmed: true,
  databases: ["postgresql"],
  framework: "express",
  name: "hello-universe",
  platformServices: ["auth", "email"],
  runtime: "node_ts",
};

const resolvedLayerFiles = {
  ".gitignore": "node_modules\n",
  Procfile: "web: node dist/index.js\n",
  "README.md": "# hello-universe\n",
  "docker-compose.dev.yml": "services:{}\n",
  "package.json": '{"name":"hello-universe"}',
  "src/index.ts": "console.log('hello universe');\n",
  "tsconfig.json": '{"compilerOptions":{}}',
};

const successRegistrationClient = {
  register(_manifest: PlatformManifest) {
    return Promise.resolve({ name: "my-app", registrationId: "stub-my-app" });
  },
};

const successDeployClient = {
  deploy(_request: { manifest: PlatformManifest }) {
    return Promise.resolve({ deploymentId: "stub-my-app-preview-1", name: "my-app" });
  },
};

const successPromoteClient = {
  promote(_request: { manifest: PlatformManifest }) {
    return Promise.resolve({ name: "my-app", promotionId: "stub-promote-my-app-production-1" });
  },
};

const successRollbackClient = {
  rollback(_request: { manifest: PlatformManifest }) {
    return Promise.resolve({ name: "my-app", rollbackId: "stub-rollback-my-app-production-1" });
  },
};

// --- handleCreate ---

describe(handleCreate, () => {
  it("writes the resolved scaffold artifacts to disk when inputs are confirmed", async () => {
    const writerCalls: { files: Record<string, string>; targetDirectory: string }[] = [];
    const deps = {
      adapters: {
        filesystemWriter: {
          writeProject(targetDirectory: string, files: Record<string, string>) {
            writerCalls.push({ files, targetDirectory });
            return Promise.resolve();
          },
        },
        promptPort: {
          promptForCreateInputs() {
            return Promise.resolve(createPromptResult);
          },
        },
      },
      services: {
        layerResolver: {
          resolveLayers(_input: CreateSelections): ResolvedLayerSet {
            return { files: resolvedLayerFiles, layers: [] };
          },
        },
        platformManifestGenerator: {
          generatePlatformManifest(_input: CreateSelections) {
            return "name: hello-universe\n";
          },
          validateManifest(_yaml: never): never {
            throw new Error("validateManifest not used in create");
          },
        },
        validator: {
          validateCreateInput(input: CreateSelections) {
            return input;
          },
        },
      },
    };

    const { output } = await handleCreate("/workspace", deps);

    expect(writerCalls).toStrictEqual([
      {
        files: {
          ...resolvedLayerFiles,
          "platform.yaml": "name: hello-universe\n",
        },
        targetDirectory: "/workspace/hello-universe",
      },
    ]);
    expect(output).toContain("Scaffolded project at /workspace/hello-universe");
  });

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

    const result = await handleCreate("/workspace", deps);

    expect(result.exitCode).toBe(1);
  });

  it("returns actionable feedback for invalid input", async () => {
    await expect(
      handleCreate("/workspace", {
        adapters: {
          filesystemWriter: {
            writeProject(_targetDirectory: never): never {
              throw new Error("filesystemWriter not used in this test");
            },
          },
          promptPort: {
            promptForCreateInputs() {
              return Promise.resolve(createPromptResult);
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
            validateCreateInput(_input: CreateSelections): never {
              throw new InvalidNameError("InvalidName");
            },
          },
        },
      }),
    ).rejects.toThrow(InvalidNameError);
  });

  it("throws a typed write failure when scaffold output cannot be written", async () => {
    await expect(
      handleCreate("/workspace", {
        adapters: {
          filesystemWriter: {
            writeProject(targetDirectory: string) {
              return Promise.reject(
                new ScaffoldWriteError(targetDirectory, new Error("disk full")),
              );
            },
          },
          promptPort: {
            promptForCreateInputs() {
              return Promise.resolve(createPromptResult);
            },
          },
        },
        services: {
          layerResolver: {
            resolveLayers(_input: CreateSelections): ResolvedLayerSet {
              return { files: resolvedLayerFiles, layers: [] };
            },
          },
          platformManifestGenerator: {
            generatePlatformManifest(_input: CreateSelections) {
              return "name: hello-universe\n";
            },
            validateManifest(_yaml: never): never {
              throw new Error("validateManifest not used in this test");
            },
          },
          validator: {
            validateCreateInput(input: CreateSelections) {
              return input;
            },
          },
        },
      }),
    ).rejects.toThrow(ScaffoldWriteError);
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

describe(handleList, () => {
  it("exits 0 on successful list retrieval", async () => {
    const result = await handleList(
      { projectDirectory: "/workspace" },
      getDeps({ listClient: successListClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and deployment entries", async () => {
    const { output } = await handleList(
      { projectDirectory: "/workspace" },
      getDeps({ listClient: successListClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("deploy-stub-001");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleList(
      { projectDirectory: "/workspace" },
      getDeps({ listClient: successListClient }, trackingReader),
    );

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

    await handleList(
      { projectDirectory: "/some/project" },
      getDeps({ listClient: successListClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleList(
        { projectDirectory: "/workspace" },
        getDeps({ listClient: successListClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleList(
        { projectDirectory: "/workspace" },
        getDeps({ listClient: successListClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when list retrieval fails", async () => {
    const failingClient = {
      getList(request: { manifest: PlatformManifest }) {
        return Promise.reject(new ListError(request.manifest.name, "unavailable"));
      },
    };

    await expect(
      handleList({ projectDirectory: "/workspace" }, getDeps({ listClient: failingClient })),
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

describe(handleLogs, () => {
  it("exits 0 on successful log retrieval", async () => {
    const result = await handleLogs(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ logsClient: successLogsClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and log entries", async () => {
    const { output } = await handleLogs(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ logsClient: successLogsClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("Application started");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleLogs(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ logsClient: successLogsClient }, trackingReader),
    );

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

    await handleLogs(
      { environment: "preview", projectDirectory: "/some/project" },
      getDeps({ logsClient: successLogsClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleLogs(
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ logsClient: successLogsClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleLogs(
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ logsClient: successLogsClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when log retrieval fails", async () => {
    const failingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        return Promise.reject(new LogsError(request.manifest.name, "timeout"));
      },
    };

    await expect(
      handleLogs(
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ logsClient: failingClient }),
      ),
    ).rejects.toThrow(LogsError);
  });

  it("passes the given environment to the logs client", async () => {
    const requests: { environment: string }[] = [];
    const trackingClient = {
      getLogs(request: { environment: string; manifest: PlatformManifest }) {
        requests.push(request);
        return Promise.resolve({ entries: [], environment: request.environment, name: "my-app" });
      },
    };

    await handleLogs(
      { environment: "production", projectDirectory: "/workspace" },
      getDeps({ logsClient: trackingClient }),
    );

    expect(requests[0]?.environment).toBe("production");
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

describe(handleStatus, () => {
  it("exits 0 on successful status retrieval", async () => {
    const result = await handleStatus(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ statusClient: successStatusClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and state", async () => {
    const { output } = await handleStatus(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ statusClient: successStatusClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("ACTIVE");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleStatus(
      { environment: "preview", projectDirectory: "/workspace" },
      getDeps({ statusClient: successStatusClient }, trackingReader),
    );

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

    await handleStatus(
      { environment: "preview", projectDirectory: "/some/project" },
      getDeps({ statusClient: successStatusClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleStatus(
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ statusClient: successStatusClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleStatus(
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ statusClient: successStatusClient }, successReader, failingValidator),
      ),
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
        { environment: "preview", projectDirectory: "/workspace" },
        getDeps({ statusClient: failingClient }),
      ),
    ).rejects.toThrow(StatusError);
  });

  it("passes the given environment to the status client", async () => {
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

    await handleStatus(
      { environment: "production", projectDirectory: "/workspace" },
      getDeps({ statusClient: trackingClient }),
    );

    expect(requests[0]?.environment).toBe("production");
  });
});

// --- handleTeardown ---

const successTeardownClient = {
  teardown(_request: { manifest: PlatformManifest }): Promise<TeardownReceipt> {
    return Promise.resolve({ name: "my-app", teardownId: "stub-teardown-my-app-1" });
  },
};

describe(handleTeardown, () => {
  it("exits 0 on successful teardown", async () => {
    const result = await handleTeardown(
      { projectDirectory: "/workspace" },
      getDeps({ teardownClient: successTeardownClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name and teardown ID", async () => {
    const { output } = await handleTeardown(
      { projectDirectory: "/workspace" },
      getDeps({ teardownClient: successTeardownClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("stub-teardown-my-app-1");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleTeardown(
      { projectDirectory: "/workspace" },
      getDeps({ teardownClient: successTeardownClient }, trackingReader),
    );

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

    await handleTeardown(
      { projectDirectory: "/some/project" },
      getDeps({ teardownClient: successTeardownClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleTeardown(
        { projectDirectory: "/workspace" },
        getDeps({ teardownClient: successTeardownClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleTeardown(
        { projectDirectory: "/workspace" },
        getDeps({ teardownClient: successTeardownClient }, successReader, failingValidator),
      ),
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
        { projectDirectory: "/workspace" },
        getDeps({ teardownClient: failingClient }),
      ),
    ).rejects.toThrow(TeardownError);
  });
});

// --- handleRegister ---

describe(handleRegister, () => {
  it("exits 0 on successful registration", async () => {
    const result = await handleRegister(
      { projectDirectory: "/workspace" },
      getDeps({ registrationClient: successRegistrationClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name and registration ID", async () => {
    const { output } = await handleRegister(
      { projectDirectory: "/workspace" },
      getDeps({ registrationClient: successRegistrationClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("stub-my-app");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleRegister(
      { projectDirectory: "/workspace" },
      getDeps({ registrationClient: successRegistrationClient }, trackingReader),
    );

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

    await handleRegister(
      { projectDirectory: "/some/project" },
      getDeps({ registrationClient: successRegistrationClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleRegister(
        { projectDirectory: "/workspace" },
        getDeps({ registrationClient: successRegistrationClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleRegister(
        { projectDirectory: "/workspace" },
        getDeps({ registrationClient: successRegistrationClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when registration fails", async () => {
    const failingClient = {
      register(manifest: PlatformManifest) {
        return Promise.reject(new RegistrationError(manifest.name, "already registered"));
      },
    };

    await expect(
      handleRegister(
        { projectDirectory: "/workspace" },
        getDeps({ registrationClient: failingClient }),
      ),
    ).rejects.toThrow(RegistrationError);
  });
});

// --- handleDeploy ---

describe(handleDeploy, () => {
  it("exits 0 on successful deployment", async () => {
    const result = await handleDeploy(
      { projectDirectory: "/workspace" },
      getDeps({ deployClient: successDeployClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, environment, and deployment ID", async () => {
    const { output } = await handleDeploy(
      { projectDirectory: "/workspace" },
      getDeps({ deployClient: successDeployClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("preview");
    expect(output).toContain("stub-my-app-preview-1");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleDeploy(
        { projectDirectory: "/workspace" },
        getDeps({ deployClient: successDeployClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleDeploy(
        { projectDirectory: "/workspace" },
        getDeps({ deployClient: successDeployClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when deployment fails", async () => {
    const failingClient = {
      deploy(request: { manifest: PlatformManifest }) {
        return Promise.reject(new DeploymentError(request.manifest.name, "timeout"));
      },
    };

    await expect(
      handleDeploy({ projectDirectory: "/workspace" }, getDeps({ deployClient: failingClient })),
    ).rejects.toThrow(DeploymentError);
  });
});

// --- handlePromote ---

describe(handlePromote, () => {
  it("exits 0 on successful promotion", async () => {
    const result = await handlePromote(
      { projectDirectory: "/workspace" },
      getDeps({ promoteClient: successPromoteClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, target environment, and promotion ID", async () => {
    const { output } = await handlePromote(
      { projectDirectory: "/workspace" },
      getDeps({ promoteClient: successPromoteClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("production");
    expect(output).toContain("stub-promote-my-app-production-1");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handlePromote(
      { projectDirectory: "/workspace" },
      getDeps({ promoteClient: successPromoteClient }, trackingReader),
    );

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

    await handlePromote(
      { projectDirectory: "/some/project" },
      getDeps({ promoteClient: successPromoteClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handlePromote(
        { projectDirectory: "/workspace" },
        getDeps({ promoteClient: successPromoteClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handlePromote(
        { projectDirectory: "/workspace" },
        getDeps({ promoteClient: successPromoteClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when promotion fails", async () => {
    const failingClient = {
      promote(request: { manifest: PlatformManifest }) {
        return Promise.reject(new PromotionError(request.manifest.name, "timeout"));
      },
    };

    await expect(
      handlePromote({ projectDirectory: "/workspace" }, getDeps({ promoteClient: failingClient })),
    ).rejects.toThrow(PromotionError);
  });
});

// --- handleRollback ---

describe(handleRollback, () => {
  it("exits 0 on successful rollback", async () => {
    const result = await handleRollback(
      { projectDirectory: "/workspace" },
      getDeps({ rollbackClient: successRollbackClient }),
    );

    expect(result.exitCode).toBe(0);
  });

  it("output contains the project name, target environment, and rollback ID", async () => {
    const { output } = await handleRollback(
      { projectDirectory: "/workspace" },
      getDeps({ rollbackClient: successRollbackClient }),
    );

    expect(output).toContain("my-app");
    expect(output).toContain("production");
    expect(output).toContain("stub-rollback-my-app-production-1");
  });

  it("reads platform.yaml from the given projectDirectory", async () => {
    const paths: string[] = [];
    const trackingReader = {
      readFile(filePath: string) {
        paths.push(filePath);
        return Promise.resolve("stack: app\n");
      },
    };

    await handleRollback(
      { projectDirectory: "/workspace" },
      getDeps({ rollbackClient: successRollbackClient }, trackingReader),
    );

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

    await handleRollback(
      { projectDirectory: "/some/project" },
      getDeps({ rollbackClient: successRollbackClient }, trackingReader),
    );

    expect(paths[0]).toBe("/some/project/platform.yaml");
  });

  it("exits when platform.yaml is missing", async () => {
    const missingReader = {
      readFile(filePath: string) {
        return Promise.reject(new ManifestNotFoundError(filePath));
      },
    };

    await expect(
      handleRollback(
        { projectDirectory: "/workspace" },
        getDeps({ rollbackClient: successRollbackClient }, missingReader),
      ),
    ).rejects.toThrow(ManifestNotFoundError);
  });

  it("exits when platform.yaml fails validation", async () => {
    const failingValidator = (_yaml: string): PlatformManifest => {
      throw new Error("invalid schema");
    };

    await expect(
      handleRollback(
        { projectDirectory: "/workspace" },
        getDeps({ rollbackClient: successRollbackClient }, successReader, failingValidator),
      ),
    ).rejects.toThrow(ManifestInvalidError);
  });

  it("exits when rollback fails", async () => {
    const failingClient = {
      rollback(request: { manifest: PlatformManifest }) {
        return Promise.reject(new RollbackError(request.manifest.name, "timeout"));
      },
    };

    await expect(
      handleRollback(
        { projectDirectory: "/workspace" },
        getDeps({ rollbackClient: failingClient }),
      ),
    ).rejects.toThrow(RollbackError);
  });
});
