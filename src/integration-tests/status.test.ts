import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdapterStubs } from "./adapter-stubs.js";
import { LocalFilesystemWriter } from "../adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "../adapters/local-project-reader.js";
import { CreateInputValidationService } from "../services/create-input-validation-service.js";
import { LayerCompositionService } from "../services/layer-composition-service.js";
import { PlatformManifestService } from "../services/platform-manifest-service.js";
import { runCli } from "../cli.js";
import type { CreateSelections, PromptPort } from "../ports/prompt-port.js";

const createNodeSelection = (name: string): CreateSelections => ({
  confirmed: true,
  databases: ["none"],
  framework: "express",
  name,
  platformServices: ["none"],
  runtime: "node_ts",
});

const createPromptPort = (selection: CreateSelections | null): PromptPort => ({
  promptForCreateInputs() {
    return Promise.resolve(selection);
  },
});

const makeDeps = (cwd: string, promptPort: PromptPort) => {
  const { observability, ...adapters } = createAdapterStubs();
  return {
    adapters: {
      ...adapters,
      filesystemWriter: new LocalFilesystemWriter(),
      projectReader: new LocalProjectReader(),
      promptPort,
    },
    cwd,
    observability,
    services: {
      layerResolver: new LayerCompositionService(),
      platformManifestGenerator: new PlatformManifestService(),
      validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
    },
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
    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection(projectName)));
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const statusResult = await runCli(["status", projectDir], deps);
    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.output).toContain(projectName);
    expect(statusResult.output).toContain("preview");
    expect(statusResult.output).toContain("ACTIVE");
  });

  it("exits 18 for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-status-"));
    tempDirectories.push(rootDirectory);

    const deps = makeDeps(rootDirectory, createPromptPort(createNodeSelection("status-failure")));
    const projectDir = join(rootDirectory, "status-failure");

    await runCli(["create"], deps);

    const result = await runCli(["status", projectDir], deps);
    expect(result.exitCode).toBe(14);
  });
});
