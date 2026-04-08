import { CliError, DeferredCommandError } from "./errors/cli-errors.js";
import type { CreateInputValidator } from "./ports/create-input-validator.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { PromptPort } from "./ports/prompt-port.js";
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

interface CliDependencies {
  observability: ObservabilityClient;
  promptPort: PromptPort;
  validator: CreateInputValidator;
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

const formatCreateSummary = (selection: {
  databases: string[];
  framework: string;
  name: string;
  platformServices: string[];
  runtime: string;
}): string =>
  [
    "Create configuration confirmed:",
    `- Name: ${selection.name}`,
    `- Runtime: ${selection.runtime}`,
    `- Framework: ${selection.framework}`,
    `- Databases: ${selection.databases.join(", ")}`,
    `- Platform services: ${selection.platformServices.join(", ")}`,
  ].join("\n");

const runCli = async (argv: string[], deps: CliDependencies): Promise<CliResult> => {
  const { observability, promptPort, validator } = deps;
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
    if (argv.length > 1) {
      return {
        exitCode: 1,
        output:
          'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
      };
    }

    const promptResult = await promptPort.promptForCreateInputs();

    if (promptResult === null || !promptResult.confirmed) {
      return { exitCode: 1, output: "Create cancelled before writing files." };
    }

    try {
      const validatedInput = validator.validateCreateInput(promptResult);

      return {
        exitCode: 0,
        output: formatCreateSummary(validatedInput),
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  return { exitCode: 1, output: `Unknown command: "${command}". Run "universe --help" for usage.` };
};

export { runCli };
export type { CliResult };
