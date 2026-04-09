#!/usr/bin/env node

import { existsSync } from "node:fs";
import { ClackPromptAdapter } from "./adapters/clack-prompt-adapter.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import { observabilityClient } from "./container.js";
import { runCli } from "./cli.js";

const filesystemWriter = new LocalFilesystemWriter();
const layerResolver = new LayerCompositionService();
const manifestGenerator = new PlatformManifestService();
const promptPort = new ClackPromptAdapter();
const inputValidator = new CreateInputValidationService((path) => existsSync(path));
const { exitCode, output } = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  filesystemWriter,
  layerResolver,
  observability: observabilityClient,
  platformManifestGenerator: manifestGenerator,
  promptPort,
  validator: inputValidator,
});

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
