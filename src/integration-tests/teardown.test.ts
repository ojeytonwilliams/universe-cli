import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFilesystemWriter } from "../adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "../adapters/local-project-reader.js";
import { StubDeployClient } from "../adapters/stub-deploy-client.js";
import { StubListClient } from "../adapters/stub-list-client.js";
import { StubLogsClient } from "../adapters/stub-logs-client.js";
import { StubObservabilityClient } from "../adapters/stub-observability-client.js";
import { StubPromoteClient } from "../adapters/stub-promote-client.js";
import { StubRegistrationClient } from "../adapters/stub-registration-client.js";
import { StubRollbackClient } from "../adapters/stub-rollback-client.js";
import { StubStatusClient } from "../adapters/stub-status-client.js";
import { StubTeardownClient } from "../adapters/stub-teardown-client.js";
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

const createDependencies = (cwd: string, promptPort: PromptPort) => ({
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
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  teardownClient: new StubTeardownClient(),
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("teardown e2e", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("tears down a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-teardown-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-teardown-app";
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const teardownResult = await runCli(["teardown", projectDir], deps);
    expect(teardownResult.exitCode).toBe(0);
    expect(teardownResult.output).toContain(projectName);
    expect(teardownResult.output).toContain("preview");
    expect(teardownResult.output).toContain(`stub-teardown-${projectName}-preview-1`);
  });

  it("exits 20 for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-teardown-e2e-"));
    tempDirectories.push(rootDirectory);

    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection("teardown-failure")),
    );
    const projectDir = join(rootDirectory, "teardown-failure");

    await runCli(["create"], deps);

    const result = await runCli(["teardown", projectDir], deps);
    expect(result.exitCode).toBe(20);
  });
});
