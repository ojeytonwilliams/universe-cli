import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { StubPackageManager } from "../commands/create/package-manager/package-manager.stub.js";
import { LocalFilesystemWriter } from "../io/local-filesystem-writer.js";
import { LocalProjectReader } from "../io/local-project-reader.js";
import { CreateInputValidationService } from "../commands/create/create-input-validation-service.js";
import { LayerCompositionService } from "../commands/create/layer-composition/layer-composition-service.js";
import { PackageManagerService } from "../commands/create/package-manager/package-manager.service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { route } from "../bin.js";
import type { CreateSelections, Prompt } from "../commands/create/prompt/prompt.port.js";

const createNodeSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: [],
  framework: "express",
  name,
  packageManager: "pnpm",
  platformServices: [],
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

describe("deploy", () => {
  let rootDirectory: string;

  beforeEach(() => {
    rootDirectory = mkdtempSync(join(tmpdir(), "universe-deploy-e2e-"));
  });

  afterEach(() => {
    rmSync(rootDirectory, { force: true, recursive: true });
  });

  it("deploys a project scaffolded by universe create", async () => {
    const projectName = "e2e-deploy-app";
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);
    expect(createResult.exitCode).toBe(0);

    const deployResult = await route(
      ["deploy", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(deployResult.exitCode).toBe(0);
    expect(deployResult.output).toContain(projectName);
    expect(deployResult.output).toContain("preview");
    expect(deployResult.output).toContain(`stub-${projectName}-preview-1`);
  });

  it("returns a deterministic incremented deployment ID on repeated deploys", async () => {
    const projectName = "e2e-repeat-deploy";
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    await route(["create"], routeDeps, { cwd: rootDirectory }, observability);
    await route(["deploy", projectDir], routeDeps, { cwd: rootDirectory }, observability);

    const secondResult = await route(
      ["deploy", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-${projectName}-preview-2`);
  });

  it("exits for the sentinel failure project name", async () => {
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection("deploy-failure")),
    );
    const projectDir = join(rootDirectory, "deploy-failure");

    await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    const result = await route(
      ["deploy", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
