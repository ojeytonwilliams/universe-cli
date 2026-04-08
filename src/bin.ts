#!/usr/bin/env node

import { DefaultCreateInputValidator } from "./adapters/default-create-input-validator.js";
import { ClackPromptAdapter } from "./adapters/clack-prompt-adapter.js";
import { observabilityClient } from "./container.js";
import { runCli } from "./cli.js";

const promptPort = new ClackPromptAdapter();
const inputValidator = new DefaultCreateInputValidator(() => false);
const { exitCode, output } = await runCli(process.argv.slice(2), {
  observability: observabilityClient,
  promptPort,
  validator: inputValidator,
});

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
