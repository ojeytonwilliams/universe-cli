import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "./adapters/local-project-reader.js";
import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { StubLogsClient } from "./adapters/stub-logs-client.js";
import { StubRollbackClient } from "./adapters/stub-rollback-client.js";
import { StubStatusClient } from "./adapters/stub-status-client.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import { runCli } from "./cli.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";

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

const createDependencies = (
  cwd: string,
  promptPort: PromptPort,
  promoteClient: StubPromoteClient,
) => ({
  cwd,
  deployClient: new StubDeployClient(),
  filesystemWriter: new LocalFilesystemWriter(),
  layerResolver: new LayerCompositionService(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  platformManifestGenerator: new PlatformManifestService(),
  projectReader: new LocalProjectReader(),
  promoteClient,
  promptPort,
  registrationClient: new StubRegistrationClient(),
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("promote e2e", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("promotes a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-promote-app";
    const promoteClient = new StubPromoteClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      promoteClient,
    );
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
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-repeat-promote";
    const promoteClient = new StubPromoteClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      promoteClient,
    );
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["promote", projectDir], deps);

    const secondResult = await runCli(["promote", projectDir], deps);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-promote-${projectName}-production-2`);
  });

  it("exits 15 for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-promote-e2e-"));
    tempDirectories.push(rootDirectory);

    const promoteClient = new StubPromoteClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection("promote-failure")),
      promoteClient,
    );
    const projectDir = join(rootDirectory, "promote-failure");

    await runCli(["create"], deps);

    const result = await runCli(["promote", projectDir], deps);
    expect(result.exitCode).toBe(15);
  });
});
