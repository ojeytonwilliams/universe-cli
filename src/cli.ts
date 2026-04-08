import { DeferredCommandError } from "./errors/cli-errors.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import { safeError } from "./ports/observability-client.js";

const HELP_TEXT = `
Usage: universe <command>

Commands:
  create      Scaffold a new project locally
  deploy      Deploy a project to the platform
  list        List all registered projects
  logs        View logs for a project
  promote     Promote a deployment to the next environment
  register    Register a project with the platform
  rollback    Roll back to the previous deployment
  status      Show the status of a project
  teardown    Remove a project from the platform

Options:
  --help      Show this help message
`.trim();

interface CliResult {
  exitCode: number;
  output: string;
}

const DEFERRED_COMMANDS = new Set([
  "deploy",
  "list",
  "logs",
  "promote",
  "register",
  "rollback",
  "status",
  "teardown",
]);

const runCli = (argv: string[], observability: ObservabilityClient): CliResult => {
  const [command] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    return { exitCode: 0, output: HELP_TEXT };
  }

  if (DEFERRED_COMMANDS.has(command)) {
    const error = new DeferredCommandError(command);
    safeError(observability, error);
    return { exitCode: error.exitCode, output: error.message };
  }

  if (command === "create") {
    const error = new DeferredCommandError(command);
    safeError(observability, error);
    return { exitCode: error.exitCode, output: error.message };
  }

  return { exitCode: 1, output: `Unknown command: "${command}". Run "universe --help" for usage.` };
};

export { runCli };
export type { CliResult };
