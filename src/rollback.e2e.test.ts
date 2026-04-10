import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "./adapters/local-project-reader.js";
import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubListClient } from "./adapters/stub-list-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubLogsClient } from "./adapters/stub-logs-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { StubRollbackClient } from "./adapters/stub-rollback-client.js";
import { StubStatusClient } from "./adapters/stub-status-client.js";
import { StubTeardownClient } from "./adapters/stub-teardown-client.js";
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
  rollbackClient: StubRollbackClient,
) => ({
  cwd,
  deployClient: new StubDeployClient(),
  filesystemWriter: new LocalFilesystemWriter(),
  layerResolver: new LayerCompositionService(),
  listClient: new StubListClient(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  platformManifestGenerator: new PlatformManifestService(),
  projectReader: new LocalProjectReader(),
  promoteClient: new StubPromoteClient(),
  promptPort,
  registrationClient: new StubRegistrationClient(),
  rollbackClient,
  statusClient: new StubStatusClient(),
  teardownClient: new StubTeardownClient(),
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("rollback e2e", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("rolls back a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-rollback-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-rollback-app";
    const rollbackClient = new StubRollbackClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      rollbackClient,
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const rollbackResult = await runCli(["rollback", projectDir], deps);
    expect(rollbackResult.exitCode).toBe(0);
    expect(rollbackResult.output).toContain(projectName);
    expect(rollbackResult.output).toContain("production");
    expect(rollbackResult.output).toContain(`stub-rollback-${projectName}-production-1`);
  });

  it("returns a deterministic incremented rollback ID on repeated rollbacks", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-rollback-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-repeat-rollback";
    const rollbackClient = new StubRollbackClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      rollbackClient,
    );
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["rollback", projectDir], deps);

    const secondResult = await runCli(["rollback", projectDir], deps);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-rollback-${projectName}-production-2`);
  });

  it("exits 16 for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-rollback-e2e-"));
    tempDirectories.push(rootDirectory);

    const rollbackClient = new StubRollbackClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection("rollback-failure")),
      rollbackClient,
    );
    const projectDir = join(rootDirectory, "rollback-failure");

    await runCli(["create"], deps);

    const result = await runCli(["rollback", projectDir], deps);
    expect(result.exitCode).toBe(16);
  });
});
