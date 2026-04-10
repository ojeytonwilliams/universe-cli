#!/usr/bin/env node

import { existsSync } from "node:fs";
import { ClackPromptAdapter } from "./adapters/clack-prompt-adapter.js";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "./adapters/local-project-reader.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import { StubDeployClient } from "./adapters/stub-deploy-client.js";
import { StubListClient } from "./adapters/stub-list-client.js";
import { StubLogsClient } from "./adapters/stub-logs-client.js";
import { StubObservabilityClient } from "./adapters/stub-observability-client.js";
import { StubPromoteClient } from "./adapters/stub-promote-client.js";
import { StubRegistrationClient } from "./adapters/stub-registration-client.js";
import { StubRollbackClient } from "./adapters/stub-rollback-client.js";
import { StubStatusClient } from "./adapters/stub-status-client.js";
import { StubTeardownClient } from "./adapters/stub-teardown-client.js";
import { runCli } from "./cli.js";

const filesystemWriter = new LocalFilesystemWriter();
const layerResolver = new LayerCompositionService();
const manifestGenerator = new PlatformManifestService();
const projectReader = new LocalProjectReader();
const promptPort = new ClackPromptAdapter();
const inputValidator = new CreateInputValidationService((path) => existsSync(path));
const { exitCode, output } = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  deployClient: new StubDeployClient(),
  filesystemWriter,
  layerResolver,
  listClient: new StubListClient(),
  logsClient: new StubLogsClient(),
  observability: new StubObservabilityClient(),
  platformManifestGenerator: manifestGenerator,
  projectReader,
  promoteClient: new StubPromoteClient(),
  promptPort,
  registrationClient: new StubRegistrationClient(),
  rollbackClient: new StubRollbackClient(),
  statusClient: new StubStatusClient(),
  teardownClient: new StubTeardownClient(),
  validator: inputValidator,
});

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
