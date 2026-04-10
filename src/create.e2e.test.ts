import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import type { LayerRegistry } from "./services/layer-composition-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import { runCli } from "./cli.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";

const DEFERRED_COMMANDS = ["list", "teardown"] as const;

const createPromptPort = (selection: CreateSelections | null): PromptPort => ({
  promptForCreateInputs() {
    return Promise.resolve(selection);
  },
});

const createNodeSelection = (selection: {
  databases: CreateSelections["databases"];
  framework: "express" | "none";
  name: string;
  platformServices: CreateSelections["platformServices"];
}): CreateSelections => ({
  confirmed: true,
  databases: selection.databases,
  framework: selection.framework,
  name: selection.name,
  platformServices: selection.platformServices,
  runtime: "node_ts",
});

const createStaticSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: ["none"],
  framework: "none",
  name,
  platformServices: ["none"],
  runtime: "static_web",
});

const collectGeneratedFiles = (directory: string): Record<string, string> => {
  const files: Record<string, string> = {};
  const stack = [directory];

  while (stack.length > 0) {
    const currentPath = stack.pop();

    if (currentPath !== undefined) {
      const entries = readdirSync(currentPath, { withFileTypes: true }).sort((left, right) =>
        left.name.localeCompare(right.name),
      );

      for (const entry of entries) {
        const entryPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else {
          const relativePath = relative(directory, entryPath).replaceAll("\\", "/");

          files[relativePath] = readFileSync(entryPath, "utf8");
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
  );
};

const createDependencies = (
  cwd: string,
  promptPort: PromptPort,
  layerRegistry?: LayerRegistry,
) => ({
  cwd,
  deployClient: {
    deploy(_request: never): Promise<{ deploymentId: string; environment: string; name: string }> {
      return Promise.reject(new Error("deployClient not exercised in create tests"));
    },
  },
  filesystemWriter: new LocalFilesystemWriter(),
  layerResolver: new LayerCompositionService(layerRegistry),
  logsClient: {
    getLogs(_request: never): Promise<{
      entries: { level: string; message: string; timestamp: string }[];
      environment: string;
      name: string;
    }> {
      return Promise.reject(new Error("logsClient not exercised in create tests"));
    },
  },
  observability: new StubObservabilityClient(),
  platformManifestGenerator: new PlatformManifestService(),
  projectReader: {
    readFile(_filePath: string): Promise<string> {
      return Promise.reject(new Error("projectReader not exercised in create tests"));
    },
  },
  promoteClient: {
    promote(
      _request: never,
    ): Promise<{ name: string; promotionId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("promoteClient not exercised in create tests"));
    },
  },
  promptPort,
  registrationClient: {
    register(_manifest: never): Promise<{ name: string; registrationId: string }> {
      return Promise.reject(new Error("registrationClient not exercised in create tests"));
    },
  },
  rollbackClient: {
    rollback(
      _request: never,
    ): Promise<{ name: string; rollbackId: string; targetEnvironment: string }> {
      return Promise.reject(new Error("rollbackClient not exercised in create tests"));
    },
  },
  statusClient: {
    getStatus(_request: never): Promise<never> {
      return Promise.reject(new Error("statusClient not exercised in create tests"));
    },
  },
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("create e2e", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("scaffolds Node.js + Express with all services", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "node-express-full",
      platformServices: ["analytics", "auth", "email"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection)),
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Node.js + no framework + no services", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "none",
      name: "node-bare",
      platformServices: ["none"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection)),
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Static", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createStaticSelection("static-smoke");

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection)),
    );

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("covers deferred command flows with the standardized contract", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));

    tempDirectories.push(rootDirectory);

    const results = await Promise.all(
      DEFERRED_COMMANDS.map(async (command) => {
        const result = await runCli(
          [command],
          createDependencies(rootDirectory, createPromptPort(createStaticSelection("ignored"))),
        );

        return { command, result };
      }),
    );

    for (const { command, result } of results) {
      expect(result.exitCode).toBe(1);
      expect(result.output).toBe(
        `The '${command}' command is not yet implemented in this spike. It will be available in a future release.`,
      );
    }
  });

  it("covers create validation failure and target-directory conflict failure", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));

    tempDirectories.push(rootDirectory);

    const invalidNameResult = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(createStaticSelection("InvalidName"))),
    );

    expect(invalidNameResult.exitCode).toBe(2);
    expect(invalidNameResult.output).toContain("Invalid project name");

    const conflictProjectName = "already-exists";

    const firstCreateResult = await runCli(
      ["create"],
      createDependencies(
        rootDirectory,
        createPromptPort(
          createNodeSelection({
            databases: ["none"],
            framework: "express",
            name: conflictProjectName,
            platformServices: ["none"],
          }),
        ),
      ),
    );

    expect(firstCreateResult.exitCode).toBe(0);

    const targetExistsResult = await runCli(
      ["create"],
      createDependencies(
        rootDirectory,
        createPromptPort(
          createNodeSelection({
            databases: ["none"],
            framework: "express",
            name: conflictProjectName,
            platformServices: ["none"],
          }),
        ),
      ),
    );

    expect(targetExistsResult.exitCode).toBe(3);
    expect(targetExistsResult.output).toContain("Target directory already exists");
  });

  it("covers config merge overwrite behavior in a create e2e flow", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "express",
      name: "config-merge-app",
      platformServices: ["none"],
    });
    const customLayers: LayerRegistry = {
      always: {
        "README.md": "# __PROJECT_NAME__\n",
      },
      "base/node-js-typescript": {
        "package.json": JSON.stringify({
          scripts: {
            build: "tsc -p tsconfig.json",
            dev: "node base-dev.js",
          },
        }),
      },
      "base/static": {
        "public/index.html": "<h1>Static</h1>\n",
      },
      "frameworks/express": {
        "package.json": JSON.stringify({
          dependencies: {
            express: "5.1.0",
          },
          scripts: {
            dev: "node framework-dev.js",
          },
        }),
      },
      "frameworks/none": {},
    };

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection), customLayers),
    );

    expect(result.exitCode).toBe(0);

    const generatedPackage = readFileSync(
      join(rootDirectory, selection.name, "package.json"),
      "utf8",
    );

    expect(generatedPackage).toBe(
      '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc -p tsconfig.json","dev":"node framework-dev.js"}}',
    );
  });

  it("covers non-config collision failure behavior in a create e2e flow", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "express",
      name: "collision-app",
      platformServices: ["none"],
    });
    const customLayers: LayerRegistry = {
      always: {
        "README.md": "# from always\n",
      },
      "base/node-js-typescript": {
        "README.md": "# from base\n",
      },
      "base/static": {
        "public/index.html": "<h1>Static</h1>\n",
      },
      "frameworks/express": {},
      "frameworks/none": {},
    };

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection), customLayers),
    );

    expect(result.exitCode).toBe(9);
    expect(result.output).toContain('File path conflict: "README.md"');
    expect(existsSync(join(rootDirectory, selection.name))).toBe(false);
  });

  it("snapshots generated Node.js scaffold output", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "snapshot-node-app",
      platformServices: ["analytics", "auth", "email"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection)),
    );

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });

  it("snapshots generated Static scaffold output", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const selection = createStaticSelection("snapshot-static-app");

    tempDirectories.push(rootDirectory);

    const result = await runCli(
      ["create"],
      createDependencies(rootDirectory, createPromptPort(selection)),
    );

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });
});
