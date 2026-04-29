import { parseArgs, route } from "./bin.js";
import type { RouteDeps } from "./bin.js";
import { StubDeviceFlow } from "./auth/stub-device-flow.js";
import { StubIdentityResolver } from "./auth/stub-identity-resolver.js";
import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import { StubProxyClient } from "./platform/proxy-client.stub.js";
import { StubTokenStore } from "./auth/stub-token-store.js";
import type { CreateSelections, Prompt } from "./commands/create/prompt/prompt.port.js";
import type { StatusResponse } from "./platform/status-client.port.js";
import type { ResolvedLayerSet } from "./commands/create/layer-composition/layer-composition-service.js";
import type { PlatformManifest } from "./services/platform-manifest-service.js";

// --- Test stubs and helpers ---
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

const defaultLogsClient = {
  getLogs() {
    return Promise.resolve({ entries: [], environment: "", name: "" });
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
  deviceFlow: new StubDeviceFlow(),
  filesystemWriter: recordingWriter,
  identityResolver: new StubIdentityResolver(null),
  layerResolver: passThroughLayerResolver,
  logsClient: defaultLogsClient,
  packageManager: { specifyDeps: () => Promise.resolve() },
  platformManifestGenerator: manifestGenerator,
  projectReader: defaultProjectReader,
  prompt: createPrompt,
  proxyClient: new StubProxyClient(),
  registrationClient: defaultRegistrationClient,
  repoInitialiser: defaultRepoInitialiser,
  statusClient: defaultStatusClient,
  teardownClient: defaultTeardownClient,
  tokenStore: new StubTokenStore(),
  validator: passThroughValidator,
  ...overrides,
});

const routeContext = { cwd: "/workspace" };

// --- route: routing, help, validation ---
describe(route, () => {
  describe("--help", () => {
    it("exits with code 0", async () => {
      const result = await route(["--help"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBe(0);
    });

    it("output contains static subcommands and auth commands", async () => {
      const { output } = await route(["--help"], createRouteDeps(), routeContext, client);
      expect(output).toContain("static deploy");
      expect(output).toContain("static rollback");
      expect(output).toContain("login");
      expect(output).toContain("logout");
      expect(output).toContain("whoami");
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

  describe("static deploy", () => {
    it("is recognised (not an unknown command error)", async () => {
      const result = await route(["static", "deploy"], createRouteDeps(), routeContext, client);
      expect(result.output).not.toContain("Unknown command");
    });

    it("exits when extra args are provided", async () => {
      const result = await route(
        ["static", "deploy", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe("deploy without static prefix", () => {
    it("exits with a non-zero code", async () => {
      const result = await route(["deploy"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe("static promote", () => {
    it("exits when extra args are provided", async () => {
      const result = await route(
        ["static", "promote", "extra"],
        createRouteDeps(),
        routeContext,
        client,
      );
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe("static rollback", () => {
    it("exits when --to is not provided", async () => {
      const result = await route(["static", "rollback"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBeGreaterThan(0);
      expect(result.output).toContain("--to");
    });
  });

  describe("static list", () => {
    it("exits when an unknown argument is provided", async () => {
      const result = await route(
        ["static", "list", "bad-arg"],
        createRouteDeps(),
        routeContext,
        client,
      );
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe("--version", () => {
    it("exits with code 0 and outputs the package version", async () => {
      const result = await route(["--version"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("login", () => {
    it("is recognised (not an unknown command error)", async () => {
      const result = await route(["login"], createRouteDeps(), routeContext, client);
      expect(result.output).not.toContain("Unknown command");
    });

    it("rejects unrecognised arguments", async () => {
      const result = await route(["login", "--foo"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBeGreaterThan(0);
    });
  });

  describe("logout", () => {
    it("exits with code 0", async () => {
      const result = await route(["logout"], createRouteDeps(), routeContext, client);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("whoami", () => {
    it("is recognised (not an unknown command error)", async () => {
      const result = await route(["whoami"], createRouteDeps(), routeContext, client);
      expect(result.output).not.toContain("Unknown command");
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

  it("returns command/options for a valid static command", () => {
    const result = parseArgs(["static", "deploy"]);
    expect(result.command).toBe("deploy");
    expect(result.error).toBeUndefined();
  });

  it("returns an error for a static command used without the static prefix", () => {
    const result = parseArgs(["deploy"]);
    expect(result.error).toBeInstanceOf(Error);
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

  it("returns login command with force: false by default", () => {
    const result = parseArgs(["login"]);
    expect(result.command).toBe("login");
    expect(result.options?.force).toBe(false);
  });

  it("returns login command with force: true when --force is passed", () => {
    const result = parseArgs(["login", "--force"]);
    expect(result.command).toBe("login");
    expect(result.options?.force).toBe(true);
  });

  it("returns an error for login with unknown arguments", () => {
    const result = parseArgs(["login", "--unknown"]);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("passes --json flag and --to option from static rollback with json before static", () => {
    const result = parseArgs(["--json", "static", "rollback", "--to", "abc"]);
    expect(result.command).toBe("rollback");
    expect(result.options?.json).toBe(true);
    expect(result.options?.to).toBe("abc");
  });

  it("returns an error for static rollback without --to", () => {
    const result = parseArgs(["static", "rollback"]);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("passes --site option from static list", () => {
    const result = parseArgs(["static", "list", "--site", "my-site"]);
    expect(result.command).toBe("list");
    expect(result.options?.site).toBe("my-site");
  });

  it("returns version command for --version", () => {
    const result = parseArgs(["--version"]);
    expect(result.command).toBe("version");
  });

  it("returns version command for -V", () => {
    const result = parseArgs(["-V"]);
    expect(result.command).toBe("version");
  });

  it("passes --promote flag from static deploy", () => {
    const result = parseArgs(["static", "deploy", "--promote"]);
    expect(result.command).toBe("deploy");
    expect(result.options?.promote).toBe(true);
  });

  it("passes --dir value from static deploy", () => {
    const result = parseArgs(["static", "deploy", "--dir", "dist"]);
    expect(result.command).toBe("deploy");
    expect(result.options?.dir).toBe("dist");
  });

  it("passes --from value from static promote", () => {
    const result = parseArgs(["static", "promote", "--from", "older-deploy"]);
    expect(result.command).toBe("promote");
    expect(result.options?.from).toBe("older-deploy");
  });

  it("returns an error for static deploy --dir without value", () => {
    const result = parseArgs(["static", "deploy", "--dir"]);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns an error for static promote --from without value", () => {
    const result = parseArgs(["static", "promote", "--from"]);
    expect(result.error).toBeInstanceOf(Error);
  });
});
