import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { HandlerResult } from "./commands.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import type { CreateSelections, Prompt } from "./prompt/prompt.port.js";
import type { StatusResponse } from "./platform/status-client.port.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import type { PlatformManifest } from "./services/platform-manifest-service.js";
import { parseArgs, route } from "./bin.js";
import type { RouteDeps } from "./bin.js";
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
    return { files: resolvedLayerFiles, layers: [] };
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

const createRouteDeps = (overrides: Partial<RouteDeps> = {}): RouteDeps => ({
  deployClient: defaultDeployClient,
  filesystemWriter: recordingWriter,
  layerResolver: passThroughLayerResolver,
  listClient: defaultListClient,
  logsClient: defaultLogsClient,
  packageManager: { run: () => Promise.resolve() },
  platformManifestGenerator: manifestGenerator,
  projectReader: defaultProjectReader,
  promoteClient: defaultPromoteClient,
  prompt: createPrompt,
  registrationClient: defaultRegistrationClient,
  repoInitialiser: defaultRepoInitialiser,
  rollbackClient: defaultRollbackClient,
  statusClient: defaultStatusClient,
  teardownClient: defaultTeardownClient,
  validator: passThroughValidator,
  ...overrides,
});

const routeContext = { cwd: "/workspace" };

// --- runCli: observability tracking ---

describe(runCli, () => {
  const makeTracking = () => {
    const trackedEvents: string[] = [];
    const obs: ObservabilityClient = {
      error() {},
      safeError() {},
      safeTrack(event: string) {
        trackedEvents.push(event);
      },
      track() {},
    };
    return { obs, trackedEvents };
  };

  const successHandler = (): Promise<HandlerResult> => Promise.resolve({ exitCode: 0, output: "" });

  describe("deploy", () => {
    it("tracks deploy.start and deploy.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("deploy", successHandler, obs);

      expect(trackedEvents).toContain("deploy.start");
      expect(trackedEvents).toContain("deploy.success");
    });

    it("tracks deploy.start and deploy.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("deploy", () => Promise.reject(new DeploymentError("app", "timeout")), obs);

      expect(trackedEvents).toContain("deploy.start");
      expect(trackedEvents).toContain("deploy.failure");
    });
  });

  describe("promote", () => {
    it("tracks promote.start and promote.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("promote", successHandler, obs);

      expect(trackedEvents).toContain("promote.start");
      expect(trackedEvents).toContain("promote.success");
    });

    it("tracks promote.start and promote.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("promote", () => Promise.reject(new PromotionError("app", "timeout")), obs);

      expect(trackedEvents).toContain("promote.start");
      expect(trackedEvents).toContain("promote.failure");
    });
  });

  describe("rollback", () => {
    it("tracks rollback.start and rollback.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("rollback", successHandler, obs);

      expect(trackedEvents).toContain("rollback.start");
      expect(trackedEvents).toContain("rollback.success");
    });

    it("tracks rollback.start and rollback.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("rollback", () => Promise.reject(new RollbackError("app", "timeout")), obs);

      expect(trackedEvents).toContain("rollback.start");
      expect(trackedEvents).toContain("rollback.failure");
    });
  });

  describe("list", () => {
    it("tracks list.start and list.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("list", successHandler, obs);

      expect(trackedEvents).toContain("list.start");
      expect(trackedEvents).toContain("list.success");
    });

    it("tracks list.start and list.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("list", () => Promise.reject(new ListError("app", "unavailable")), obs);

      expect(trackedEvents).toContain("list.start");
      expect(trackedEvents).toContain("list.failure");
    });
  });

  describe("logs", () => {
    it("tracks logs.start and logs.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("logs", successHandler, obs);

      expect(trackedEvents).toContain("logs.start");
      expect(trackedEvents).toContain("logs.success");
    });

    it("tracks logs.start and logs.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("logs", () => Promise.reject(new LogsError("app", "timeout")), obs);

      expect(trackedEvents).toContain("logs.start");
      expect(trackedEvents).toContain("logs.failure");
    });
  });

  describe("status", () => {
    it("tracks status.start and status.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("status", successHandler, obs);

      expect(trackedEvents).toContain("status.start");
      expect(trackedEvents).toContain("status.success");
    });

    it("tracks status.start and status.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("status", () => Promise.reject(new StatusError("app", "unavailable")), obs);

      expect(trackedEvents).toContain("status.start");
      expect(trackedEvents).toContain("status.failure");
    });
  });

  describe("teardown", () => {
    it("tracks teardown.start and teardown.success on a successful handler", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("teardown", successHandler, obs);

      expect(trackedEvents).toContain("teardown.start");
      expect(trackedEvents).toContain("teardown.success");
    });

    it("tracks teardown.start and teardown.failure on a CliError", async () => {
      const { obs, trackedEvents } = makeTracking();

      await runCli("teardown", () => Promise.reject(new TeardownError("app", "unavailable")), obs);

      expect(trackedEvents).toContain("teardown.start");
      expect(trackedEvents).toContain("teardown.failure");
    });
  });
});

// --- route: routing, help, validation ---

describe(route, () => {
  describe("--help", () => {
    it("exits with code 0", async () => {
      const result = await route(["--help"], createRouteDeps(), routeContext, client);

      expect(result.exitCode).toBe(0);
    });

    it("output lists all 9 commands", async () => {
      const { output } = await route(["--help"], createRouteDeps(), routeContext, client);

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

    it("does not call observability for help", async () => {
      const tracked: string[] = [];
      const trackingObs: ObservabilityClient = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          tracked.push(event);
        },
        track() {},
      };

      await route(["--help"], createRouteDeps(), routeContext, trackingObs);

      expect(tracked).toHaveLength(0);
    });
  });

  describe("-h", () => {
    it("exits with code 0", async () => {
      const result = await route(["-h"], createRouteDeps(), routeContext, client);

      expect(result.exitCode).toBe(0);
    });
  });

  describe("no arguments", () => {
    it("exits with code 0 and prints help", async () => {
      const result = await route([], createRouteDeps(), routeContext, client);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage:");
    });
  });

  describe("unknown command", () => {
    it("exits with a non-zero code", async () => {
      const result = await route(["unknown-cmd"], createRouteDeps(), routeContext, client);

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Unknown command");
    });

    it("does not call observability for unknown commands", async () => {
      const tracked: string[] = [];
      const trackingObs: ObservabilityClient = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          tracked.push(event);
        },
        track() {},
      };

      await route(["unknown-cmd"], createRouteDeps(), routeContext, trackingObs);

      expect(tracked).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("is interactive-only and rejects extra args", async () => {
      const result = await route(["create", "my-app"], createRouteDeps(), routeContext, client);

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("interactive-only");
    });

    it("does not call observability on bad args", async () => {
      const tracked: string[] = [];
      const trackingObs: ObservabilityClient = {
        error() {},
        safeError() {},
        safeTrack(event: string) {
          tracked.push(event);
        },
        track() {},
      };

      await route(["create", "my-app"], createRouteDeps(), routeContext, trackingObs);

      expect(tracked).toHaveLength(0);
    });
  });

  describe("register", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["register", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("deploy", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["deploy", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("promote", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["promote", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("rollback", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["rollback", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("list", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["list", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });

  describe("logs", () => {
    it("exits when more than two arguments are provided", async () => {
      const result = await route(
        ["logs", "/dir", "preview", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });

    it("exits when environment is not preview or production", async () => {
      const result = await route(
        ["logs", "/dir", "staging"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
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

      await route(
        ["logs"],
        createRouteDeps({ logsClient: trackingLogsClient }),
        routeContext,
        client,
      );

      expect(requests[0]?.environment).toBe("preview");
    });
  });

  describe("status", () => {
    it("exits when more than two arguments are provided", async () => {
      const result = await route(
        ["status", "/dir", "preview", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });

    it("exits when environment is not preview or production", async () => {
      const result = await route(
        ["status", "/dir", "staging"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
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

      await route(
        ["status"],
        createRouteDeps({ statusClient: trackingStatusClient }),
        routeContext,
        client,
      );

      expect(requests[0]?.environment).toBe("preview");
    });
  });

  describe("teardown", () => {
    it("exits when more than one argument is provided", async () => {
      const result = await route(
        ["teardown", "/dir", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );

      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("Too many arguments");
    });
  });
});

describe(parseArgs, () => {
  it("returns a help command when no arguments are provided", () => {
    const result = parseArgs([]);

    expect(result).toStrictEqual({ command: "help", options: {} });
  });

  it("returns an error without command/options for an unknown command", () => {
    const result = parseArgs(["unknown-cmd"]);

    expect(result.error).toBeInstanceOf(Error);
    expect(result).not.toHaveProperty("command");
    expect(result).not.toHaveProperty("options");
  });

  it("returns command/options without error for valid single-directory commands", () => {
    const result = parseArgs(["deploy", "/dir"]);

    expect(result).toStrictEqual({ command: "deploy", options: { projectDirectory: "/dir" } });
    expect(result).not.toHaveProperty("error");
  });

  it("returns environment defaults for logs", () => {
    const result = parseArgs(["logs"]);

    expect(result).toStrictEqual({ command: "logs", options: { environment: "preview" } });
  });

  it("returns an error without command/options for invalid status environment", () => {
    const result = parseArgs(["status", "/dir", "staging"]);

    expect(result.error).toBeInstanceOf(Error);
    expect(result).not.toHaveProperty("command");
    expect(result).not.toHaveProperty("options");
  });
});
