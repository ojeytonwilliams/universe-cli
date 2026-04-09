import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import { runCli } from "./cli.js";
import { InvalidNameError, ScaffoldWriteError } from "./errors/cli-errors.js";

const client: ObservabilityClient = {
  error() {},
  track() {},
};

const DEFERRED_COMMANDS = [
  "deploy",
  "list",
  "logs",
  "promote",
  "register",
  "rollback",
  "status",
  "teardown",
] as const;

const createPromptResult: CreateSelections = {
  confirmed: true,
  databases: ["PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Auth", "Email"],
  runtime: "Node.js (TypeScript)",
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

const createDeps = (
  promptPort: PromptPort,
  validator: { validateCreateInput(input: CreateSelections): CreateSelections },
  filesystemWriter: FilesystemWriter = recordingWriter,
) => ({
  cwd: "/workspace",
  filesystemWriter,
  layerResolver: passThroughLayerResolver,
  observability: client,
  platformManifestGenerator: manifestGenerator,
  promptPort,
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

    it("emits the standardized not-implemented message", async () => {
      const { output } = await runCli(["register"], createDeps(createPrompt, passThroughValidator));

      expect(output).toMatchInlineSnapshot(
        `"The 'register' command is not yet implemented in this spike. It will be available in a future release."`,
      );
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
});
