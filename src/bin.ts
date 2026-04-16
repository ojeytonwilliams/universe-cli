#!/usr/bin/env node

import { existsSync } from "node:fs";
import { ClackPrompt } from "./prompt/clack-prompt.js";
import { LocalFilesystemWriter } from "./io/local-filesystem-writer.js";
import { LocalProjectReader } from "./io/local-project-reader.js";
import { GitRepoInitialiser } from "./io/git-repo-initialiser.js";
import { PnpmPackageManager } from "./package-manager/pnpm-package-manager.js";
import { BunPackageManager } from "./package-manager/bun-package-manager.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import { StubDeployClient } from "./platform/deploy-client.stub.js";
import { StubListClient } from "./platform/list-client.stub.js";
import { StubLogsClient } from "./platform/logs-client.stub.js";
import { StubObservabilityClient } from "./observability/observability-client.stub.js";
import { StubPromoteClient } from "./platform/promote-client.stub.js";
import { StubRegistrationClient } from "./platform/registration-client.stub.js";
import { StubRollbackClient } from "./platform/rollback-client.stub.js";
import { StubStatusClient } from "./platform/status-client.stub.js";
import { StubTeardownClient } from "./platform/teardown-client.stub.js";
import { runCli } from "./cli.js";
import { PackageManagerService } from "./package-manager/package-manager.service.js";

const filesystemWriter = new LocalFilesystemWriter();
const layerResolver = new LayerCompositionService();
const manifestGenerator = new PlatformManifestService();

const packageManager = new PackageManagerService({
  bun: new BunPackageManager(),
  pnpm: new PnpmPackageManager(),
});
const repoInitialiser = new GitRepoInitialiser();
const projectReader = new LocalProjectReader();
const prompt = new ClackPrompt();
const inputValidator = new CreateInputValidationService((path) => existsSync(path));
const { exitCode, output } = await runCli(process.argv.slice(2), {
  adapters: {
    deployClient: new StubDeployClient(),
    filesystemWriter,
    listClient: new StubListClient(),
    logsClient: new StubLogsClient(),
    projectReader,
    promoteClient: new StubPromoteClient(),
    prompt,
    registrationClient: new StubRegistrationClient(),
    repoInitialiser,
    rollbackClient: new StubRollbackClient(),
    statusClient: new StubStatusClient(),
    teardownClient: new StubTeardownClient(),
  },
  cwd: process.cwd(),
  observability: new StubObservabilityClient(),
  services: {
    layerResolver,
    packageManager,
    platformManifestGenerator: manifestGenerator,
    validator: inputValidator,
  },
});

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
