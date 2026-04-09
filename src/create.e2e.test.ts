import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import type { LayerRegistry } from "./services/layer-composition-service.js";
import { LocalPlatformManifestGenerator } from "./adapters/local-platform-manifest-generator.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { runCli } from "./cli.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";

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

const NODE_DATABASE_OPTIONS = ["PostgreSQL", "Redis"] as const;
const NODE_PLATFORM_SERVICE_OPTIONS = ["Auth", "Email", "Analytics"] as const;

const createPromptPort = (selection: CreateSelections | null): PromptPort => ({
  promptForCreateInputs() {
    return Promise.resolve(selection);
  },
});

const createNodeSelection = (selection: {
  databases: CreateSelections["databases"];
  framework: "Express" | "None";
  name: string;
  platformServices: CreateSelections["platformServices"];
}): CreateSelections => ({
  confirmed: true,
  databases: selection.databases,
  framework: selection.framework,
  name: selection.name,
  platformServices: selection.platformServices,
  runtime: "Node.js (TypeScript)",
});

const createStaticSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: ["None"],
  framework: "None",
  name,
  platformServices: ["None"],
  runtime: "Static (HTML/CSS/JS)",
});

const buildPowerSet = <TValue>(items: readonly TValue[]): TValue[][] => {
  const subsets: TValue[][] = [[]];

  for (const item of items) {
    const existingSubsets = [...subsets];

    for (const subset of existingSubsets) {
      subsets.push([...subset, item]);
    }
  }

  return subsets;
};

const toMultiSelectValues = (items: string[]): string[] =>
  items.length === 0 ? ["None"] : [...items].sort((left, right) => left.localeCompare(right));

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
  filesystemWriter: new LocalFilesystemWriter(),
  layerResolver: new LayerCompositionService(layerRegistry),
  observability: new StubObservabilityClient(),
  platformManifestGenerator: new LocalPlatformManifestGenerator(),
  promptPort,
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

  it("creates a project folder for every allowed runtime/framework/services combination", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-e2e-"));
    const nodeFrameworks = ["Express", "None"] as const;
    const nodeDatabaseSelections = buildPowerSet(NODE_DATABASE_OPTIONS).map((selection) =>
      toMultiSelectValues([...selection]),
    );
    const nodePlatformServiceSelections = buildPowerSet(NODE_PLATFORM_SERVICE_OPTIONS).map(
      (selection) => toMultiSelectValues([...selection]),
    );
    const allSelections: CreateSelections[] = [];
    let sequence = 0;

    tempDirectories.push(rootDirectory);

    for (const framework of nodeFrameworks) {
      for (const databases of nodeDatabaseSelections) {
        for (const platformServices of nodePlatformServiceSelections) {
          allSelections.push(
            createNodeSelection({
              databases: databases as CreateSelections["databases"],
              framework,
              name: `node-${sequence.toString().padStart(3, "0")}`,
              platformServices: platformServices as CreateSelections["platformServices"],
            }),
          );
          sequence += 1;
        }
      }
    }

    allSelections.push(createStaticSelection("static-000"));

    const results = await Promise.all(
      allSelections.map(async (selection) => {
        const result = await runCli(
          ["create"],
          createDependencies(rootDirectory, createPromptPort(selection)),
        );

        return { result, selection };
      }),
    );

    for (const { result, selection } of results) {
      expect(result.exitCode).toBe(0);
      expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
    }
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
            databases: ["None"],
            framework: "Express",
            name: conflictProjectName,
            platformServices: ["None"],
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
            databases: ["None"],
            framework: "Express",
            name: conflictProjectName,
            platformServices: ["None"],
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
      databases: ["None"],
      framework: "Express",
      name: "config-merge-app",
      platformServices: ["None"],
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
      databases: ["None"],
      framework: "Express",
      name: "collision-app",
      platformServices: ["None"],
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
      databases: ["PostgreSQL", "Redis"],
      framework: "Express",
      name: "snapshot-node-app",
      platformServices: ["Analytics", "Auth", "Email"],
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
