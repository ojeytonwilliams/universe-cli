import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { StubPackageManager } from "../commands/create/package-manager/package-manager.stub.js";
import { LocalFilesystemWriter } from "../io/local-filesystem-writer.js";
import { LocalProjectReader } from "../io/local-project-reader.js";
import { CreateInputValidationService } from "../commands/create/create-input-validation-service.js";
import { LayerCompositionService } from "../commands/create/layers-composition/layer-composition-service.js";
import { PackageManagerService } from "../commands/create/package-manager/package-manager.service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { route } from "../bin.js";
import type { CreateSelections, Prompt } from "../commands/create/prompt/prompt.port.js";

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

describe("promote", () => {
  let rootDirectory: string;

  beforeEach(() => {
    rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-"));
  });

  afterEach(() => {
    rmSync(rootDirectory, { force: true, recursive: true });
  });

  it("promotes a project scaffolded by universe create", async () => {
    const projectName = "promote-app";
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await route(["create"], routeDeps, { cwd: rootDirectory }, observability);
    expect(createResult.exitCode).toBe(0);

    const promoteResult = await route(
      ["promote", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(promoteResult.exitCode).toBe(0);
    expect(promoteResult.output).toContain(projectName);
    expect(promoteResult.output).toContain("production");
    expect(promoteResult.output).toContain(`stub-promote-${projectName}-production-1`);
  });

  it("returns a deterministic incremented promotion ID on repeated promotes", async () => {
    const projectName = "repeat-promote";
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    await route(["create"], routeDeps, { cwd: rootDirectory }, observability);
    await route(["promote", projectDir], routeDeps, { cwd: rootDirectory }, observability);

    const secondResult = await route(
      ["promote", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-promote-${projectName}-production-2`);
  });

  it("exits for the sentinel failure project name", async () => {
    const { observability, ...routeDeps } = makeDeps(
      rootDirectory,
      createPromptPort(createNodeSelection("promote-failure")),
    );
    const projectDir = join(rootDirectory, "promote-failure");

    await route(["create"], routeDeps, { cwd: rootDirectory }, observability);

    const result = await route(
      ["promote", projectDir],
      routeDeps,
      { cwd: rootDirectory },
      observability,
    );
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
