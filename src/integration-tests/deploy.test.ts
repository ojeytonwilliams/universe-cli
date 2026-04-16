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
    adapters: {
      ...adapters,
      filesystemWriter: new LocalFilesystemWriter(),
      projectReader: new LocalProjectReader(),
      prompt,
    },
    cwd,
    observability,
    services: {
      layerResolver: new LayerCompositionService(),
      packageManager: new PackageManagerService({
        bun: new StubPackageManager(),
        pnpm: new StubPackageManager(),
      }),
      platformManifestGenerator: new PlatformManifestService(),
      validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
    },
  };
};

describe("deploy", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("deploys a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-deploy-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-deploy-app";
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const deployResult = await runCli(["deploy", projectDir], deps);
    expect(deployResult.exitCode).toBe(0);
    expect(deployResult.output).toContain(projectName);
    expect(deployResult.output).toContain("preview");
    expect(deployResult.output).toContain(`stub-${projectName}-preview-1`);
  });

  it("returns a deterministic incremented deployment ID on repeated deploys", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-deploy-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-repeat-deploy";
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["deploy", projectDir], deps);

    const secondResult = await runCli(["deploy", projectDir], deps);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-${projectName}-preview-2`);
  });

  it("exits for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-deploy-e2e-"));
    tempDirectories.push(rootDirectory);

    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection("deploy-failure")));
    const projectDir = join(rootDirectory, "deploy-failure");

    await runCli(["create"], deps);

    const result = await runCli(["deploy", projectDir], deps);
    expect(result.exitCode).toBe(10);
  });
});
