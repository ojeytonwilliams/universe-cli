import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { createAdapterStubs } from "./adapter-stubs.js";
import { StubPackageManager } from "../commands/create/package-manager/package-manager.stub.js";
import { LayerCompositionService } from "../commands/create/layer-composition/layer-composition-service.js";
import type { LayerRegistry } from "../commands/create/layer-composition/layer-composition-service.js";
import { PackageManagerService } from "../commands/create/package-manager/package-manager.service.js";
import type {
  PackageManagerRunner,
  RunOptions,
} from "../commands/create/package-manager/package-manager.service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { CreateInputValidationService } from "../commands/create/create-input-validation-service.js";
import { LocalFilesystemWriter } from "../io/local-filesystem-writer.js";
import { LocalProjectReader } from "../io/local-project-reader.js";
import { route } from "../bin.js";
import type { CreateSelections, Prompt } from "../commands/create/prompt/prompt.port.js";
import type { RepoInitialiser } from "../io/repo-initialiser.port.js";

interface AdapterOverrides {
  repoInitialiser?: RepoInitialiser;
}

interface MakeDepsOptions {
  adapterOverrides?: AdapterOverrides;
  layerRegistry?: LayerRegistry;
  packageManagerService?: PackageManagerRunner;
}

const createPromptPort = (selection: CreateSelections | null): Prompt => ({
  promptForCreateInputs() {
    return Promise.resolve(selection);
  },
});

const createNodeSelection = (selection: {
  databases: CreateSelections["databases"];
  framework: "express" | "typescript";
  name: string;
  platformServices: CreateSelections["platformServices"];
}): CreateSelections => ({
  confirmed: true,
  databases: selection.databases,
  framework: selection.framework,
  name: selection.name,
  packageManager: "pnpm",
  platformServices: selection.platformServices,
  runtime: "node",
});

const createStaticSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: ["none"],
  framework: "html-css-js",
  name,
  packageManager: "pnpm",
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

const makeDeps = (cwd: string, prompt: Prompt, options: MakeDepsOptions = {}) => {
  const { adapterOverrides = {}, layerRegistry, packageManagerService } = options;
  const { observability, ...adapters } = createAdapterStubs();
  return {
    ...adapters,
    filesystemWriter: new LocalFilesystemWriter(),
    layerResolver: layerRegistry
      ? new LayerCompositionService(layerRegistry)
      : new LayerCompositionService(),
    observability,
    packageManager:
      packageManagerService ??
      new PackageManagerService({
        bun: new StubPackageManager(),
        pnpm: new StubPackageManager(),
      }),
    platformManifestGenerator: new PlatformManifestService(),
    projectReader: new LocalProjectReader(),
    prompt,
    validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
    ...adapterOverrides,
  };
};

describe("create", () => {
  let rootDirectory: string;

  beforeEach(() => {
    rootDirectory = mkdtempSync(join(tmpdir(), "universe-create-"));
  });

  afterEach(() => {
    rmSync(rootDirectory, { force: true, recursive: true });
  });

  it("scaffolds Node.js + Express with all services", async () => {
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "node-express-full",
      platformServices: ["analytics", "auth", "email"],
    });

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Node.js + typescript + no services", async () => {
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "typescript",
      name: "node-bare",
      platformServices: ["none"],
    });

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("scaffolds Static", async () => {
    const selection = createStaticSelection("static-smoke");

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(rootDirectory, selection.name))).toBe(true);
  });

  it("covers create validation failure and target-directory conflict failure", async () => {
    const { observability: obsInvalid, ...routeDepsInvalid } = makeDeps(
      rootDirectory,
      createPromptPort(createStaticSelection("InvalidName")),
    );
    const invalidNameResult = await route(
      ["create"],
      routeDepsInvalid,
      { cwd: rootDirectory },
      obsInvalid,
    );

    expect(invalidNameResult.exitCode).toBeGreaterThan(0);
    expect(invalidNameResult.output).toContain("Invalid project name");

    const conflictProjectName = "already-exists";

    const { observability: obsFirst, ...routeDepsFirst } = makeDeps(
      rootDirectory,
      createPromptPort(
        createNodeSelection({
          databases: ["none"],
          framework: "express",
          name: conflictProjectName,
          platformServices: ["none"],
        }),
      ),
    );
    const firstCreateResult = await route(
      ["create"],
      routeDepsFirst,
      { cwd: rootDirectory },
      obsFirst,
    );

    expect(firstCreateResult.exitCode).toBe(0);

    const { observability: obsConflict, ...routeDepsConflict } = makeDeps(
      rootDirectory,
      createPromptPort(
        createNodeSelection({
          databases: ["none"],
          framework: "express",
          name: conflictProjectName,
          platformServices: ["none"],
        }),
      ),
    );
    const targetExistsResult = await route(
      ["create"],
      routeDepsConflict,
      { cwd: rootDirectory },
      obsConflict,
    );

    expect(targetExistsResult.exitCode).toBeGreaterThan(0);
    expect(targetExistsResult.output).toContain("Target directory already exists");
  });

  it("covers config merge overwrite behavior in a create flow", async () => {
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "express",
      name: "config-merge-app",
      platformServices: ["none"],
    });
    const customLayers: LayerRegistry = {
      always: {
        files: { "README.md": "# __PROJECT_NAME__\n" },
      },
      "base/node": {
        files: {
          "package.json": JSON.stringify({
            scripts: {
              build: "tsc -p tsconfig.json",
              dev: "node base-dev.js",
            },
          }),
        },
      },
      "base/static": {
        files: { "public/index.html": "<h1>Static</h1>\n" },
      },
      "frameworks/express": {
        files: {
          "package.json": JSON.stringify({
            dependencies: {
              express: "5.1.0",
            },
            scripts: {
              dev: "node framework-dev.js",
            },
          }),
        },
      },
      "package-managers/pnpm": { files: {} },
    };

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      layerRegistry: customLayers,
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

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
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "express",
      name: "collision-app",
      platformServices: ["none"],
    });
    const customLayers: LayerRegistry = {
      always: {
        files: { "README.md": "# from always\n" },
      },
      "base/node": {
        files: { "README.md": "# from base\n" },
      },
      "base/static": {
        files: { "public/index.html": "<h1>Static</h1>\n" },
      },
      "frameworks/express": { files: {} },
      "package-managers/pnpm": { files: {} },
    };

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      layerRegistry: customLayers,
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBeGreaterThan(0);
    expect(result.output).toContain('File path conflict: "README.md"');
    expect(existsSync(join(rootDirectory, selection.name))).toBe(false);
  });

  it("snapshots generated Node.js scaffold output", async () => {
    const selection = createNodeSelection({
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "snapshot-node-app",
      platformServices: ["analytics", "auth", "email"],
    });

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });

  it("includes pnpm security artefacts in Node.js scaffold", async () => {
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "typescript",
      name: "pnpm-security-app",
      platformServices: ["none"],
    });

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);

    const files = collectGeneratedFiles(join(rootDirectory, selection.name));
    const expectedWorkspace = [
      "blockExoticSubdeps: true",
      "minimumReleaseAge: 1440",
      "trustPolicy: no-downgrade",
      "engineStrict: true",
      "",
    ].join("\n");

    expect(files["pnpm-workspace.yaml"]).toBe(expectedWorkspace);
    expect(files[".npmrc"]).toBeUndefined();

    const pkg = JSON.parse(files["package.json"]!) as { scripts: Record<string, string> };

    expect(pkg.scripts["preinstall"]).toBe("npx only-allow pnpm");
  });

  it("static scaffold pnpm-workspace.yaml is empty", async () => {
    const selection = createStaticSelection("static-workspace-check");

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);

    const files = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(files["pnpm-workspace.yaml"]).toBe("");
    expect(files[".npmrc"]).toBeUndefined();
  });

  it("calls packageManager.run with the target directory for Node.js scaffold", async () => {
    const name = "node-install-spy";
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "typescript",
      name,
      platformServices: ["none"],
    });

    const run = vi.fn((_opts: RunOptions) => Promise.resolve());

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      packageManagerService: { run },
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(run).toHaveBeenCalledWith({
      manager: "pnpm",
      projectDirectory: join(rootDirectory, name),
    });
  });

  it("does not call packageManager.run for Static scaffold", async () => {
    const name = "static-no-install-spy";
    const selection = createStaticSelection(name);

    const run = vi.fn((_opts: RunOptions) => Promise.resolve());

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      packageManagerService: { run },
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it("calls repoInitialiser.initialise with the target directory for Node.js scaffold", async () => {
    const name = "node-repo-init-spy";
    const selection = createNodeSelection({
      databases: ["none"],
      framework: "typescript",
      name,
      platformServices: ["none"],
    });

    const repoInitialiser = { initialise: vi.fn((_dir: string) => Promise.resolve()) };

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      adapterOverrides: { repoInitialiser },
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(repoInitialiser.initialise).toHaveBeenCalledWith(join(rootDirectory, name));
  });

  it("calls repoInitialiser.initialise with the target directory for Static scaffold", async () => {
    const name = "static-repo-init-spy";
    const selection = createStaticSelection(name);

    const repoInitialiser = { initialise: vi.fn((_dir: string) => Promise.resolve()) };

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection), {
      adapterOverrides: { repoInitialiser },
    });
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);
    expect(repoInitialiser.initialise).toHaveBeenCalledWith(join(rootDirectory, name));
  });

  it("snapshots generated Static scaffold output", async () => {
    const selection = createStaticSelection("snapshot-static-app");

    const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
    const result = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    expect(result.exitCode).toBe(0);

    const generatedFiles = collectGeneratedFiles(join(rootDirectory, selection.name));

    expect(generatedFiles).toMatchSnapshot();
  });

  describe("docker scaffold output", () => {
    it("node + express + pnpm Dockerfile contains base image and build steps", async () => {
      const selection = createNodeSelection({
        databases: ["none"],
        framework: "express",
        name: "docker-express-dockerfile",
        platformServices: ["none"],
      });

      const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
      await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

      const files = collectGeneratedFiles(join(rootDirectory, selection.name));

      expect(files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
      expect(files["Dockerfile"]).toContain("COPY src/ ./src/");
      expect(files["Dockerfile"]).toContain("COPY tsconfig.json ./");
      expect(files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
    });

    it("node + express + pnpm .dockerignore and compose have correct docker config", async () => {
      const selection = createNodeSelection({
        databases: ["none"],
        framework: "express",
        name: "docker-express-compose",
        platformServices: ["none"],
      });

      const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
      await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

      const files = collectGeneratedFiles(join(rootDirectory, selection.name));

      expect(files[".dockerignore"]).toContain("node_modules");

      const compose = parseYaml(files["docker-compose.dev.yml"]!) as Record<string, unknown>;
      const app = (compose["services"] as Record<string, unknown>)["app"] as Record<
        string,
        unknown
      >;

      expect(app["image"]).toBeUndefined();
      expect(app["build"]).toBeDefined();
      expect(app["develop"]).toBeDefined();
    });

    it("node + typescript + pnpm Dockerfile contains base image and build steps", async () => {
      const selection = createNodeSelection({
        databases: ["none"],
        framework: "typescript",
        name: "docker-typescript-dockerfile",
        platformServices: ["none"],
      });

      const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
      await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

      const files = collectGeneratedFiles(join(rootDirectory, selection.name));

      expect(files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
      expect(files["Dockerfile"]).toContain("COPY src/ ./src/");
      expect(files["Dockerfile"]).toContain("COPY tsconfig.json ./");
      expect(files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
    });

    it("node + typescript + pnpm .dockerignore and compose have correct docker config", async () => {
      const selection = createNodeSelection({
        databases: ["none"],
        framework: "typescript",
        name: "docker-typescript-compose",
        platformServices: ["none"],
      });

      const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
      await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

      const files = collectGeneratedFiles(join(rootDirectory, selection.name));

      expect(files[".dockerignore"]).toContain("node_modules");

      const compose = parseYaml(files["docker-compose.dev.yml"]!) as Record<string, unknown>;
      const app = (compose["services"] as Record<string, unknown>)["app"] as Record<
        string,
        unknown
      >;

      expect(app["image"]).toBeUndefined();
      expect(app["build"]).toBeDefined();
      expect(app["develop"]).toBeDefined();
    });

    it("static + html-css-js + pnpm scaffold produces a .dockerignore, Dockerfile, and docker-compose.dev.yml", async () => {
      const selection = createStaticSelection("docker-static-test");

      const { observability, ...routeDeps } = makeDeps(rootDirectory, createPromptPort(selection));
      await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

      const files = collectGeneratedFiles(join(rootDirectory, selection.name));

      expect(files[".dockerignore"]).toBeDefined();
      expect(files["Dockerfile"]).toBeDefined();
      expect(files["docker-compose.dev.yml"]).toBeDefined();
    });
  });
});
