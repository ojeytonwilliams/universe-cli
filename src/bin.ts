#!/usr/bin/env node

import { observabilityClient } from "./container.js";
import { runCli } from "./cli.js";

const { exitCode, output } = runCli(process.argv.slice(2), observabilityClient);

if (output.length > 0) {
  process.stdout.write(`${output}\n`);
}

process.exitCode = exitCode;
