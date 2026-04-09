/* oxlint-disable import/max-dependencies -- E2E tests require full adapter wiring */
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
  deployClient: StubDeployClient,
) => ({
  cwd,
  deployClient,
  filesystemWriter: new LocalFilesystemWriter(),
  layerResolver: new LayerCompositionService(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  platformManifestGenerator: new PlatformManifestService(),
  projectReader: new LocalProjectReader(),
  promoteClient: new StubPromoteClient(),
  promptPort,
  registrationClient: new StubRegistrationClient(),
  rollbackClient: new StubRollbackClient(),
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("deploy e2e", () => {
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
    const deployClient = new StubDeployClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      deployClient,
    );
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
    const deployClient = new StubDeployClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      deployClient,
    );
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["deploy", projectDir], deps);

    const secondResult = await runCli(["deploy", projectDir], deps);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.output).toContain(`stub-${projectName}-preview-2`);
  });

  it("exits 14 for the sentinel failure project name", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-deploy-e2e-"));
    tempDirectories.push(rootDirectory);

    const deployClient = new StubDeployClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection("deploy-failure")),
      deployClient,
    );
    const projectDir = join(rootDirectory, "deploy-failure");

    await runCli(["create"], deps);

    const result = await runCli(["deploy", projectDir], deps);
    expect(result.exitCode).toBe(14);
  });
});
