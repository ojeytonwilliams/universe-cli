import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { StubPackageManager } from "../package-manager/package-manager.stub.js";
import { LocalFilesystemWriter } from "../io/local-filesystem-writer.js";
import { LocalProjectReader } from "../io/local-project-reader.js";
import { CreateInputValidationService } from "../services/create-input-validation-service.js";
import { LayerCompositionService } from "../services/layer-composition-service.js";
import { PackageManagerService } from "../package-manager/package-manager.service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { route } from "../bin.js";
import type { CreateSelections, Prompt } from "../prompt/prompt.port.js";

const createNodeSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: ["none"],
  framework: "express",
  name,
  packageManager: "pnpm",
  platformServices: ["none"],
  runtime: "node",
});

const createPromptPort = (selection: CreateSelections | null): Prompt => ({
  promptForCreateInputs() {
    return Promise.resolve(selection);
  },
});

const makeDeps = (cwd: string, prompt: Prompt) => {
  const { observability, ...adapters } = createAdapterStubs();
  return {
    ...adapters,
    filesystemWriter: new LocalFilesystemWriter(),
    layerResolver: new LayerCompositionService(),
    observability,
    packageManager: new PackageManagerService({
      bun: new StubPackageManager(),
      pnpm: new StubPackageManager(),
    }),
    platformManifestGenerator: new PlatformManifestService(),
    projectReader: new LocalProjectReader(),
    prompt,
    validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
  };
};

describe("status", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("retrieves status for a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-status-"));
    tempDirectories.push(rootDirectory);

    const projectName = "status-app";
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);
    expect(createResult.exitCode).toBe(0);

    const statusResult = await route(
      ["status", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.output).toContain(projectName);
    expect(statusResult.output).toContain("preview");
    expect(statusResult.output).toContain("ACTIVE");
  });

  it("exits for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-status-"));
    tempDirectories.push(rootDirectory);

    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection("status-failure")),
    );
    const projectDir = join(rootDirectory, "status-failure");

    await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    const result = await route(
      ["status", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
