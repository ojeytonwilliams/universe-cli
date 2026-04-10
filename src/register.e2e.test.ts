import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "./adapters/local-project-reader.js";
import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubListClient } from "./adapters/stub-list-client.js";
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
  registrationClient: StubRegistrationClient,
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
  registrationClient,
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  validator: new CreateInputValidationService((path) => existsSync(join(cwd, path))),
});

describe("register e2e", () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }

    tempDirectories.length = 0;
  });

  it("registers a project scaffolded by universe create", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-register-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-register-app";
    const registrationClient = new StubRegistrationClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      registrationClient,
    );
    const projectDir = join(rootDirectory, projectName);

    const createResult = await runCli(["create"], deps);
    expect(createResult.exitCode).toBe(0);

    const registerResult = await runCli(["register", projectDir], deps);
    expect(registerResult.exitCode).toBe(0);
    expect(registerResult.output).toContain(projectName);
    expect(registerResult.output).toContain(`stub-${projectName}`);
  });

  it("exits 13 when the same project is registered twice", async () => {
    const rootDirectory = mkdtempSync(join(tmpdir(), "universe-register-e2e-"));
    tempDirectories.push(rootDirectory);

    const projectName = "e2e-duplicate-app";
    const registrationClient = new StubRegistrationClient();
    const deps = createDependencies(
      rootDirectory,
      createPromptPort(createNodeSelection(projectName)),
      registrationClient,
    );
    const projectDir = join(rootDirectory, projectName);

    await runCli(["create"], deps);
    await runCli(["register", projectDir], deps);

    const secondResult = await runCli(["register", projectDir], deps);
    expect(secondResult.exitCode).toBe(13);
  });
});
