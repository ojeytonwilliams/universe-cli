import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import type {
  AppPlatformManifest,
  PlatformManifest,
} from "./services/platform-manifest-service.js";
import { runCli } from "./cli.js";
import {
  DeploymentError,
  InvalidNameError,
  ManifestNotFoundError,
  RegistrationError,
  ScaffoldWriteError,
} from "./errors/cli-errors.js";

const client: ObservabilityClient = {
  error() {},
  track() {},
};

const DEFERRED_COMMANDS = ["list", "logs", "promote", "rollback", "status", "teardown"] as const;

const createPromptResult: CreateSelections = {
  confirmed: true,
  databases: ["postgresql"],
  framework: "express",
  name: "hello-universe",
  platformServices: ["auth", "email"],
  runtime: "node_ts",
};

const createPrompt: PromptPort = {
  promptForCreateInputs() {
    return Promise.resolve(createPromptResult);
  },
};

const cancelledCreatePrompt: PromptPort = {
  promptForCreateInputs() {
    return Promise.resolve(null);
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
    throw new Error("validateManifest called unexpectedly in a create test");
  },
};

const writerCalls: { files: Record<string, string>; targetDirectory: string }[] = [];

const recordingWriter: FilesystemWriter = {
  writeProject(targetDirectory, files) {
    writerCalls.push({ files, targetDirectory });

    return Promise.resolve();
  },
};

const failingWriter: FilesystemWriter = {
  writeProject(targetDirectory) {
    return Promise.reject(new ScaffoldWriteError(targetDirectory, new Error("disk full")));
  },
};

const invalidNameValidator = {
  validateCreateInput(_input: CreateSelections): CreateSelections {
    throw new InvalidNameError("InvalidName");
  },
};

const defaultProjectReader = {
  readFile(_filePath: string): Promise<string> {
    return Promise.reject(new Error("projectReader.readFile should not be called in this test"));
  },
};

const defaultRegistrationClient = {
  register(_manifest: PlatformManifest): Promise<{ name: string; registrationId: string }> {
    return Promise.reject(
      new Error("registrationClient.register should not be called in this test"),
    );
  },
};

const defaultDeployClient = {
  deploy(_request: {
    environment: string;
    manifest: PlatformManifest;
  }): Promise<{ deploymentId: string; environment: string; name: string }> {
    return Promise.reject(new Error("deployClient.deploy should not be called in this test"));
  },
};

const createDeps = (
  promptPort: PromptPort,
  validator: { validateCreateInput(input: CreateSelections): CreateSelections },
  filesystemWriter: FilesystemWriter = recordingWriter,
) => ({
  cwd: "/workspace",
  deployClient: defaultDeployClient,
  filesystemWriter,
  layerResolver: passThroughLayerResolver,
  observability: client,
  platformManifestGenerator: manifestGenerator,
  projectReader: defaultProjectReader,
  promptPort,
  registrationClient: defaultRegistrationClient,
  validator,
});

describe(runCli, () => {
  beforeEach(() => {
    writerCalls.length = 0;
  });

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

  describe("deferred commands", () => {
    it.each(DEFERRED_COMMANDS)('"%s" exits non-zero', async (cmd) => {
      const result = await runCli([cmd], createDeps(createPrompt, passThroughValidator));

      expect(result.exitCode).not.toBe(0);
    });

    it.each(DEFERRED_COMMANDS)('"%s" output contains the command name', async (cmd) => {
      const { output } = await runCli([cmd], createDeps(createPrompt, passThroughValidator));

      expect(output).toContain(cmd);
    });
  });

  describe("create", () => {
    it("writes the resolved scaffold artifacts to disk when inputs are confirmed", async () => {
      const { output } = await runCli(["create"], createDeps(createPrompt, passThroughValidator));

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
      const result = await runCli(
        ["create"],
        createDeps(cancelledCreatePrompt, passThroughValidator),
      );

      expect(result.exitCode).toBe(1);
    });

    it("is interactive-only and rejects extra args", async () => {
      const { output } = await runCli(
        ["create", "my-app"],
        createDeps(createPrompt, passThroughValidator),
      );

      expect(output).toBe(
        'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
      );
    });

    it("returns actionable feedback for invalid input", async () => {
      const result = await runCli(["create"], createDeps(createPrompt, invalidNameValidator));

      expect(result.output).toContain("Invalid project name");
    });

    it("returns a typed write failure when scaffold output cannot be written", async () => {
      const result = await runCli(
        ["create"],
        createDeps(createPrompt, passThroughValidator, failingWriter),
      );

      expect(result.output).toContain("Failed to write scaffold");
    });
  });

  describe("register", () => {
    const registerManifest: AppPlatformManifest = {
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
    const successValidator = (_yaml: string): PlatformManifest => registerManifest;
    const successClient = {
      register(_manifest: PlatformManifest) {
        return Promise.resolve({ name: "my-app", registrationId: "stub-my-app" });
      },
    };

    const registerDeps = (
      reader = successReader,
      validator = successValidator,
      registrationClient = successClient,
    ) => ({
      ...createDeps(createPrompt, passThroughValidator),
      platformManifestGenerator: { ...manifestGenerator, validateManifest: validator },
      projectReader: reader,
      registrationClient,
    });

    it("exits 0 on successful registration", async () => {
      const result = await runCli(["register"], registerDeps());

      expect(result.exitCode).toBe(0);
    });

    it("output contains the project name and registration ID", async () => {
      const { output } = await runCli(["register"], registerDeps());

      expect(output).toContain("my-app");
      expect(output).toContain("stub-my-app");
    });

    it("reads platform.yaml from cwd when no directory argument is given", async () => {
      const paths: string[] = [];
      const trackingReader = {
        readFile(filePath: string) {
          paths.push(filePath);
          return Promise.resolve("stack: app\n");
        },
      };

      await runCli(["register"], registerDeps(trackingReader));

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

      await runCli(["register", "/some/project"], registerDeps(trackingReader));

      expect(paths[0]).toBe("/some/project/platform.yaml");
    });

    it("exits 11 when platform.yaml is missing", async () => {
      const missingReader = {
        readFile(filePath: string) {
          return Promise.reject(new ManifestNotFoundError(filePath));
        },
      };

      const result = await runCli(["register"], registerDeps(missingReader));

      expect(result.exitCode).toBe(11);
    });

    it("exits 12 when platform.yaml fails validation", async () => {
      const failingValidator = (_yaml: string): PlatformManifest => {
        throw new Error("invalid schema");
      };

      const result = await runCli(["register"], registerDeps(successReader, failingValidator));

      expect(result.exitCode).toBe(12);
    });

    it("exits 13 when registration fails", async () => {
      const failingClient = {
        register(manifest: PlatformManifest) {
          return Promise.reject(new RegistrationError(manifest.name, "already registered"));
        },
      };

      const result = await runCli(
        ["register"],
        registerDeps(successReader, successValidator, failingClient),
      );

      expect(result.exitCode).toBe(13);
    });

    it("exits 1 when more than one argument is provided", async () => {
      const result = await runCli(["register", "dir1", "dir2"], registerDeps());

      expect(result.exitCode).toBe(1);
    });
  });

  describe("deploy", () => {
    const deployManifest: AppPlatformManifest = {
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
    const successValidator = (_yaml: string): PlatformManifest => deployManifest;
    const successDeployClient = {
      deploy(_request: { environment: string; manifest: PlatformManifest }) {
        return Promise.resolve({
          deploymentId: "stub-my-app-preview-1",
          environment: "preview",
          name: "my-app",
        });
      },
    };

    const deployDeps = (
      reader = successReader,
      validator = successValidator,
      deployClient = successDeployClient,
    ) => ({
      ...createDeps(createPrompt, passThroughValidator),
      deployClient,
      platformManifestGenerator: { ...manifestGenerator, validateManifest: validator },
      projectReader: reader,
    });

    it("exits 0 on successful deployment", async () => {
      const result = await runCli(["deploy"], deployDeps());

      expect(result.exitCode).toBe(0);
    });

    it("output contains the project name, environment, and deployment ID", async () => {
      const { output } = await runCli(["deploy"], deployDeps());

      expect(output).toContain("my-app");
      expect(output).toContain("preview");
      expect(output).toContain("stub-my-app-preview-1");
    });

    it("defaults to the preview environment when no environment argument is given", async () => {
      const requests: { environment: string }[] = [];
      const trackingClient = {
        deploy(request: { environment: string; manifest: PlatformManifest }) {
          requests.push(request);
          return Promise.resolve({
            deploymentId: "stub-my-app-preview-1",
            environment: request.environment,
            name: "my-app",
          });
        },
      };

      await runCli(["deploy"], deployDeps(successReader, successValidator, trackingClient));

      expect(requests[0]?.environment).toBe("preview");
    });

    it("exits 11 when platform.yaml is missing", async () => {
      const missingReader = {
        readFile(filePath: string) {
          return Promise.reject(new ManifestNotFoundError(filePath));
        },
      };

      const result = await runCli(["deploy"], deployDeps(missingReader));

      expect(result.exitCode).toBe(11);
    });

    it("exits 12 when platform.yaml fails validation", async () => {
      const failingValidator = (_yaml: string): PlatformManifest => {
        throw new Error("invalid schema");
      };

      const result = await runCli(["deploy"], deployDeps(successReader, failingValidator));

      expect(result.exitCode).toBe(12);
    });

    it("exits 14 when deployment fails", async () => {
      const failingClient = {
        deploy(request: { environment: string; manifest: PlatformManifest }) {
          return Promise.reject(new DeploymentError(request.manifest.name, "timeout"));
        },
      };

      const result = await runCli(
        ["deploy"],
        deployDeps(successReader, successValidator, failingClient),
      );

      expect(result.exitCode).toBe(14);
    });

    it("exits 1 when more than two arguments are provided", async () => {
      const result = await runCli(["deploy", "/dir", "preview", "extra"], deployDeps());

      expect(result.exitCode).toBe(1);
    });

    it("exits 6 when environment is not preview or production", async () => {
      const result = await runCli(["deploy", "/dir", "staging"], deployDeps());

      expect(result.exitCode).toBe(6);
    });

    it("tracks deploy.start and deploy.success on a successful deployment", async () => {
      const trackedEvents: string[] = [];
      const trackingObservability = {
        error() {},
        track(event: string) {
          trackedEvents.push(event);
        },
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
        track(event: string) {
          trackedEvents.push(event);
        },
      };
      const failingClient = {
        deploy(request: { environment: string; manifest: PlatformManifest }) {
          return Promise.reject(new DeploymentError(request.manifest.name, "timeout"));
        },
      };

      await runCli(["deploy"], {
        ...deployDeps(successReader, successValidator, failingClient),
        observability: trackingObservability,
      });

      expect(trackedEvents).toContain("deploy.start");
      expect(trackedEvents).toContain("deploy.failure");
    });

    it("does not change exit code when observability.track throws", async () => {
      const throwingObservability = {
        error() {},
        track() {
          throw new Error("o11y down");
        },
      };

      const result = await runCli(["deploy"], {
        ...deployDeps(),
        observability: throwingObservability,
      });

      expect(result.exitCode).toBe(0);
    });
  });
});
