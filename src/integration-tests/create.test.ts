import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { LayerCompositionService } from "../services/layer-composition-service.js";
import type { LayerRegistry } from "../services/layer-composition-service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { CreateInputValidationService } from "../services/create-input-validation-service.js";
import { LocalFilesystemWriter } from "../adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "../adapters/local-project-reader.js";
import { runCli } from "../cli.js";
import type { CreateSelections, PromptPort } from "../ports/prompt-port.js";

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

const makeDeps = (cwd: string, promptPort: PromptPort, layerRegistry?: LayerRegistry) => {
  const stubs = createAdapterStubs();
  return {
    ...stubs,
    cwd,
    filesystemWriter: new LocalFilesystemWriter(),
    layerResolver: layerRegistry
      ? new LayerCompositionService(layerRegistry)
      : new LayerCompositionService(),
    platformManifestGenerator: new PlatformManifestService(),
    projectReader: new LocalProjectReader(),
    promptPort,
    validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
  };
};

describe("create", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("scaffolds Node.js + Express with all services", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "node-express-full",
      platformServices: ["analytics", "auth", "email"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(["create"], makeDeps(rootDirectory, createPromptPort(selection)));

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Node.js + no framework + no services", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "none",
      name: "node-bare",
      platformServices: ["none"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(["create"], makeDeps(rootDirectory, createPromptPort(selection)));

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Static", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
    const selection = createStaticSelection("static-smoke");

    tempDirectories.push(rootDirectory);

    const result = await runCli(["create"], makeDeps(rootDirectory, createPromptPort(selection)));

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("covers create validation failure and target-directory conflict failure", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));

    tempDirectories.push(rootDirectory);

    const invalidNameResult = await runCli(
      ["create"],
      makeDeps(rootDirectory, createPromptPort(createStaticSelection("InvalidName"))),
    );

    expect(invalidNameResult.exitCode).toBe(17);
    expect(invalidNameResult.output).toContain("Invalid project name");

    const conflictProjectName = "already-exists";

    const firstCreateResult = await runCli(
      ["create"],
      makeDeps(
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
      makeDeps(
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

  it("covers config merge overwrite behavior in a create flow", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
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
      makeDeps(rootDirectory, createPromptPort(selection), customLayers),
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

  it("covers non-config collision failure behavior in a create flow", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
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
      makeDeps(rootDirectory, createPromptPort(selection), customLayers),
    );

    expect(result.exitCode).toBe(6);
    expect(result.output).toContain('File path conflict: "README.md"');
    expect(existsSync(join(rootDirectory, selection.name))).toBe(false);
  });

  it("snapshots generated Node.js scaffold output", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "snapshot-node-app",
      platformServices: ["analytics", "auth", "email"],
    });

    tempDirectories.push(rootDirectory);

    const result = await runCli(["create"], makeDeps(rootDirectory, createPromptPort(selection)));

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });

  it("snapshots generated Static scaffold output", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
    const selection = createStaticSelection("snapshot-static-app");

    tempDirectories.push(rootDirectory);

    const result = await runCli(["create"], makeDeps(rootDirectory, createPromptPort(selection)));

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });
});
