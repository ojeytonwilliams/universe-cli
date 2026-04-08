#!/usr/bin/env node

// oxlint-disable-next-line import/no-nodejs-modules
import { existsSync } from "fs";
import { DefaultCreateInputValidator } from "./adapters/default-create-input-validator.js";
import { ClackPromptAdapter } from "./adapters/clack-prompt-adapter.js";
import { LocalFilesystemWriter } from "./adapters/local-filesystem-writer.js";
import { LocalLayerResolver } from "./adapters/local-layer-resolver.js";
import { LocalPlatformManifestGenerator } from "./adapters/local-platform-manifest-generator.js";
import { observabilityClient } from "./container.js";
import { runCli } from "./cli.js";

const filesystemWriter = new LocalFilesystemWriter();
const layerResolver = new LocalLayerResolver();
const manifestGenerator = new LocalPlatformManifestGenerator();
const promptPort = new ClackPromptAdapter();
const inputValidator = new DefaultCreateInputValidator((path) => existsSync(path));
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
