#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { ClackPromptAdapter } from "./adapters/clack-prompt-adapter.js";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalProjectReader } from "./adapters/local-project-reader.js";
import { GitRepoInitialiserAdapter } from "./adapters/git-repo-initialiser-adapter.js";
import { PnpmPackageManagerAdapter } from "./adapters/pnpm-package-manager-adapter.js";
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

const execFileAsync = promisify(execFile);

const runCommandVoid = async (command: string, args: string[], cwd: string): Promise<void> => {
  await execFileAsync(command, args, { cwd });
};

const runCommand = async (command: string, args: string[], cwd: string): Promise<string> => {
  const { stdout } = await execFileAsync(command, args, { cwd, encoding: "utf8" });
  return stdout;
};

const filesystemApi = {
  readFile: (path: string) => readFile(path, "utf8"),
  writeFile: (path: string, content: string) => writeFile(path, content, "utf8"),
};

const filesystemWriter = new LocalFilesystemWriter();
const layerResolver = new LayerCompositionService();
const manifestGenerator = new PlatformManifestService();
const packageManager = new PnpmPackageManagerAdapter(runCommand, filesystemApi);
const repoInitialiser = new GitRepoInitialiserAdapter(runCommandVoid);
const projectReader = new LocalProjectReader();
const prompt = new ClackPromptAdapter();
const inputValidator = new CreateInputValidationService((path) => existsSync(path));
const { exitCode, output } = await runCli(process.argv.slice(2), {
  adapters: {
    deployClient: new StubDeployClient(),
    filesystemWriter,
    listClient: new StubListClient(),
    logsClient: new StubLogsClient(),
    packageManager,
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
    platformManifestGenerator: manifestGenerator,
    validator: inputValidator,
  },
});

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
