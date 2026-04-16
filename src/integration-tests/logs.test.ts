import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { LocalFilesystemWriter } from "../io/local-filesystem-writer.js";
import { LocalProjectReader } from "../io/local-project-reader.js";
import { CreateInputValidationService } from "../services/create-input-validation-service.js";
import { LayerCompositionService } from "../services/layer-composition-service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { runCli } from "../cli.js";
import type { CreateSelections, Prompt } from "../prompt/prompt.port.js";
import { PackageManagerService } from "../package-manager/package-manager.service.js";
import { StubPackageManager } from "../package-manager/package-manager.stub.js";

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

describe("logs", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("retrieves logs for a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-logs-"));
    tempDirectories.push(rootDirectory);

    const projectName = "logs-app";
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const logsResult = await runCli(["logs", projectDir], deps);
    expect(logsResult.exitCode).toBe(0);
    expect(logsResult.output).toContain(projectName);
    expect(logsResult.output).toContain("preview");
  });

  it("exits for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-logs-"));
    tempDirectories.push(rootDirectory);

    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection("logs-failure")));
    const projectDir = join(rootDirectory, "logs-failure");

    await runCli(["create"], deps);

    const result = await runCli(["logs", projectDir], deps);
    expect(result.exitCode).toBeGreaterThan(0);
  });
});
