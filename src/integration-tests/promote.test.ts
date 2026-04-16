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
import { runCli } from "../cli.js";
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
    cwd,
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
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("promotes a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-"));
    tempDirectories.push(rootDirectory);

    const projectName = "promote-app";
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const promoteResult = await runCli(["promote", projectDir], deps);
    expect(promoteResult.exitCode).toBe(0);
    expect(promoteResult.output).toContain(projectName);
    expect(promoteResult.output).toContain("production");
    expect(promoteResult.output).toContain(`stub-promote-${projectName}-production-1`);
  });

  it("returns a deterministic incremented promotion ID on repeated promotes", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-"));
    tempDirectories.push(rootDirectory);

    const projectName = "repeat-promote";
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["promote", projectDir], deps);

    const secondResult = await runCli(["promote", projectDir], deps);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-promote-${projectName}-production-2`);
  });

  it("exits for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-"));
    tempDirectories.push(rootDirectory);

    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection("promote-failure")));
    const projectDir = join(rootDirectory, "promote-failure");

    await runCli(["create"], deps);

    const result = await runCli(["promote", projectDir], deps);
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
