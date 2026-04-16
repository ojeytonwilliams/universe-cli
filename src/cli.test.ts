import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { CreateSelections, Prompt } from "./ports/prompt.js";
import type { StatusResponse } from "./ports/status-client.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import type { PlatformManifest } from "./services/platform-manifest-service.js";
import { runCli } from "./cli.js";
import {
  DeploymentError,
  ListError,
  LogsError,
  PromotionError,
  RollbackError,
  StatusError,
  TeardownError,
} from "./errors/cli-errors.js";

const client: ObservabilityClient = {
  error() {},
  safeError() {},
  safeTrack() {},
  track() {},
};

const createPromptResult: CreateSelections = {
  confirmed: true,
  databases: ["postgresql"],
  framework: "express",
  name: "hello-universe",
  packageManager: "pnpm",
  platformServices: ["auth", "email"],
  runtime: "node",
};

const createPrompt: Prompt = {
  promptForCreateInputs() {
    return Promise.resolve(createPromptResult);
  },
};

const passThroughValidator = {
  validateCreateInput(input: CreateSelections) {
    return input;
  },
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

const passThroughLayerResolver = {
  resolveLayers(_input: CreateSelections): ResolvedLayerSet {
    return {
      files: resolvedLayerFiles,
      layers: [],
    };
  },
};

const manifestGenerator = {
  generatePlatformManifest(_input: CreateSelections) {
    return "name: hello-universe\n";
  },
  validateManifest(_yaml: string): PlatformManifest {
    return defaultManifest;
  },
};
const recordingWriter: FilesystemWriter = {
  writeProject() {
    return Promise.resolve();
  },
};

const defaultProjectReader = {
  readFile() {
    return Promise.resolve("");
  },
};

const defaultRegistrationClient = {
  register() {
    return Promise.resolve({ name: "", registrationId: "" });
  },
};

const defaultListClient = {
  getList() {
    return Promise.resolve({ deployments: [], name: "" });
  },
};

const defaultLogsClient = {
  getLogs() {
    return Promise.resolve({ entries: [], environment: "", name: "" });
  },
};

const defaultDeployClient = {
  deploy() {
    return Promise.resolve({ deploymentId: "", name: "" });
  },
};

const defaultPromoteClient = {
  promote() {
    return Promise.resolve({ name: "", promotionId: "" });
  },
};

const defaultRollbackClient = {
  rollback() {
    return Promise.resolve({ name: "", rollbackId: "" });
  },
};

const defaultStatusClient = {
  getStatus(): Promise<StatusResponse> {
    return Promise.resolve({ environment: "", name: "", state: "INACTIVE", updatedAt: "" });
  },
};

const defaultTeardownClient = {
  teardown() {
    return Promise.resolve({ name: "", teardownId: "" });
  },
};

const defaultManifest: PlatformManifest = {
  domain: { preview: "my-app.preview.example.com", production: "my-app.example.com" },
  environments: { preview: { branch: "preview" }, production: { branch: "main" } },
  name: "my-app",
  owner: "platform-engineering",
  resources: [],
  schemaVersion: "1",
  services: [],
  stack: "app",
};

const defaultRepoInitialiser = {
  initialise: (_dir: string) => Promise.resolve(),
};

const createDeps = (
  prompt: Prompt,
  validator: { validateCreateInput(input: CreateSelections): CreateSelections },
  filesystemWriter: FilesystemWriter = recordingWriter,
) => ({
  adapters: {
    deployClient: defaultDeployClient,
    filesystemWriter,
    listClient: defaultListClient,
    logsClient: defaultLogsClient,
    projectReader: defaultProjectReader,
    promoteClient: defaultPromoteClient,
    prompt,
    registrationClient: defaultRegistrationClient,
    repoInitialiser: defaultRepoInitialiser,
    rollbackClient: defaultRollbackClient,
    statusClient: defaultStatusClient,
    teardownClient: defaultTeardownClient,
  },
  cwd: "/workspace",
  observability: client,
  services: {
    layerResolver: passThroughLayerResolver,
    packageManager: { run: () => Promise.resolve() },
    platformManifestGenerator: manifestGenerator,
    validator,
  },
});

describe(runCli, () => {
  describe("--help", () => {
    it("exits with code 0", async () => {
      const result = await runCli(["--help"], createDeps(createPrompt, passThroughValidator));

      expect(result.exitCode).toBe(0);
    });

    it("output lists all 9 commands", async () => {
      const { output } = await runCli(["--help"], createDeps(createPrompt, passThroughValidator));

      expect(output).toMatchInlineSnapshot(`
        "Usage: universe <command>

        Commands:
          create      Scaffold a new project locally
          deploy      Deploy a project to the platform
          list        List all registered projects
          logs        View logs for a project
          promote     Promote a deployment to the next environment
          register    Register a project with the platform
          rollback    Roll back to the previous deployment
          status      Show the status of a project
          teardown    Remove a project from the platform

        Options:
          --help      Show this help message"
      `);
    });
  });

  describe("create", () => {
    it("is interactive-only and rejects extra args", async () => {
      const result = await runCli(
        ["create", "my-app"],
        createDeps(createPrompt, passThroughValidator),
      );

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("interactive-only");
    });
  });

  describe("register", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await runCli(
        ["register", "/dir", "extra"],
        createDeps(createPrompt, passThroughValidator),
      );

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("deploy", () => {
    const successDeployClient = {
      deploy(_request: { manifest: PlatformManifest }) {
        return Promise.resolve({
          deploymentId: "stub-my-app-preview-1",
          name: "my-app",
        });
      },
    };

    const deployDeps = (deployClient = successDeployClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, deployClient },
      };
    };

    it("tracks deploy.start and deploy.success on a successful deployment", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["deploy"], {
        ...deployDeps(),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("deploy.start");
      expect(trackedEvents).toContain("deploy.success");
    });

    it("tracks deploy.start and deploy.failure on a failed deployment", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        deploy(request: { manifest: PlatformManifest }) {
          return Promise.reject(new DeploymentError(request.manifest.name, "timeout"));
        },
      };

      await runCli(["deploy"], {
        ...deployDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("deploy.start");
      expect(trackedEvents).toContain("deploy.failure");
    });

    it("exits when more than one argument is provided", async () => {
      const result = await runCli(["deploy", "/dir", "extra"], deployDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("promote", () => {
    const successPromoteClient = {
      promote(_request: { manifest: PlatformManifest }) {
        return Promise.resolve({
          name: "my-app",
          promotionId: "stub-promote-my-app-production-1",
        });
      },
    };

    const promoteDeps = (promoteClient = successPromoteClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, promoteClient },
      };
    };

    it("tracks promote.start and promote.success on a successful promotion", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["promote"], {
        ...promoteDeps(),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("promote.start");
      expect(trackedEvents).toContain("promote.success");
    });

    it("tracks promote.start and promote.failure on a failed promotion", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        promote(request: { manifest: PlatformManifest }) {
          return Promise.reject(new PromotionError(request.manifest.name, "timeout"));
        },
      };

      await runCli(["promote"], {
        ...promoteDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("promote.start");
      expect(trackedEvents).toContain("promote.failure");
    });

    it("exits when more than one argument is provided", async () => {
      const result = await runCli(["promote", "/dir", "extra"], promoteDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("rollback", () => {
    const successRollbackClient = {
      rollback(_request: { manifest: PlatformManifest }) {
        return Promise.resolve({
          name: "my-app",
          rollbackId: "stub-rollback-my-app-production-1",
        });
      },
    };

    const rollbackDeps = (rollbackClient = successRollbackClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, rollbackClient },
      };
    };

    it("tracks rollback.start and rollback.success on a successful rollback", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["rollback"], {
        ...rollbackDeps(),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("rollback.start");
      expect(trackedEvents).toContain("rollback.success");
    });

    it("tracks rollback.start and rollback.failure on a failed rollback", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        rollback(request: { manifest: PlatformManifest }) {
          return Promise.reject(new RollbackError(request.manifest.name, "timeout"));
        },
      };

      await runCli(["rollback"], {
        ...rollbackDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("rollback.start");
      expect(trackedEvents).toContain("rollback.failure");
    });

    it("exits when more than one argument is provided", async () => {
      const result = await runCli(["rollback", "/dir", "extra"], rollbackDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("list", () => {
    const stubDeployments = [
      { deployedAt: "2026-01-01T00:00:00.000Z", deploymentId: "deploy-stub-001", state: "ACTIVE" },
    ];
    const successListClient = {
      getList(_request: { manifest: PlatformManifest }) {
        return Promise.resolve({ deployments: stubDeployments, name: "my-app" });
      },
    };

    const listDeps = (listClient = successListClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, listClient },
      };
    };

    it("tracks list.start and list.success on successful retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["list"], { ...listDeps(), observability: trackingObservability });

      expect(trackedEvents).toContain("list.start");
      expect(trackedEvents).toContain("list.success");
    });

    it("tracks list.start and list.failure on a failed retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        getList(request: { manifest: PlatformManifest }) {
          return Promise.reject(new ListError(request.manifest.name, "unavailable"));
        },
      };

      await runCli(["list"], {
        ...listDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("list.start");
      expect(trackedEvents).toContain("list.failure");
    });

    it("exits when more than one argument is provided", async () => {
      const result = await runCli(["list", "/dir", "extra"], listDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("logs", () => {
    const stubEntries = [
      { level: "info", message: "Application started", timestamp: "2026-01-01T00:00:00.000Z" },
    ];
    const successLogsClient = {
      getLogs(_request: { environment: string; manifest: PlatformManifest }) {
        return Promise.resolve({ entries: stubEntries, environment: "preview", name: "my-app" });
      },
    };

    const logsDeps = (logsClient = successLogsClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, logsClient },
      };
    };

    it("tracks logs.start and logs.success on successful retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["logs"], { ...logsDeps(), observability: trackingObservability });

      expect(trackedEvents).toContain("logs.start");
      expect(trackedEvents).toContain("logs.success");
    });

    it("tracks logs.start and logs.failure on a failed retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        getLogs(request: { environment: string; manifest: PlatformManifest }) {
          return Promise.reject(new LogsError(request.manifest.name, "timeout"));
        },
      };

      await runCli(["logs"], {
        ...logsDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("logs.start");
      expect(trackedEvents).toContain("logs.failure");
    });

    it("exits when more than two arguments are provided", async () => {
      const result = await runCli(["logs", "/dir", "preview", "extra"], logsDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });

    it("exits when environment is not preview or production", async () => {
      const result = await runCli(["logs", "/dir", "staging"], logsDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain('"staging"');
    });

    it("defaults to the preview environment when no environment argument is given", async () => {
      const requests: { environment: string }[] = [];
      const trackingLogsClient = {
        getLogs(request: { environment: string; manifest: PlatformManifest }) {
          requests.push(request);
          return Promise.resolve({
            entries: [],
            environment: request.environment,
            name: "my-app",
          });
        },
      };

      await runCli(["logs"], logsDeps(trackingLogsClient));

      expect(requests[0]?.environment).toBe("preview");
    });
  });

  describe("status", () => {
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

    const statusDeps = (statusClient = successStatusClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, statusClient },
      };
    };

    it("tracks status.start and status.success on successful retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["status"], { ...statusDeps(), observability: trackingObservability });

      expect(trackedEvents).toContain("status.start");
      expect(trackedEvents).toContain("status.success");
    });

    it("tracks status.start and status.failure on a failed retrieval", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        getStatus(request: { environment: string; manifest: PlatformManifest }) {
          return Promise.reject(new StatusError(request.manifest.name, "unavailable"));
        },
      };

      await runCli(["status"], {
        ...statusDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("status.start");
      expect(trackedEvents).toContain("status.failure");
    });

    it("exits when more than two arguments are provided", async () => {
      const result = await runCli(["status", "/dir", "preview", "extra"], statusDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });

    it("exits when environment is not preview or production", async () => {
      const result = await runCli(["status", "/dir", "staging"], statusDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain('"staging"');
    });

    it("defaults to the preview environment when no environment argument is given", async () => {
      const requests: { environment: string }[] = [];
      const trackingStatusClient = {
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

      await runCli(["status"], statusDeps(trackingStatusClient));

      expect(requests[0]?.environment).toBe("preview");
    });
  });

  describe("teardown", () => {
    const successTeardownClient = {
      teardown(_request: { manifest: PlatformManifest }) {
        return Promise.resolve({ name: "my-app", teardownId: "stub-teardown-my-app-1" });
      },
    };

    const teardownDeps = (teardownClient = successTeardownClient) => {
      const base = createDeps(createPrompt, passThroughValidator);
      return {
        ...base,
        adapters: { ...base.adapters, teardownClient },
      };
    };

    it("tracks teardown.start and teardown.success on successful teardown", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };

      await runCli(["teardown"], { ...teardownDeps(), observability: trackingObservability });

      expect(trackedEvents).toContain("teardown.start");
      expect(trackedEvents).toContain("teardown.success");
    });

    it("tracks teardown.start and teardown.failure on a failed teardown", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          trackedEvents.push(event);
        },
        track() {},
      };
      const failingClient = {
        teardown(request: { manifest: PlatformManifest }) {
          return Promise.reject(new TeardownError(request.manifest.name, "unavailable"));
        },
      };

      await runCli(["teardown"], {
        ...teardownDeps(failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("teardown.start");
      expect(trackedEvents).toContain("teardown.failure");
    });

    it("exits when more than one argument is provided", async () => {
      const result = await runCli(["teardown", "/dir", "extra"], teardownDeps());

      expect(result.exitCode).toBe(18);
      expect(result.output).toContain("Too many arguments");
    });
  });
});
