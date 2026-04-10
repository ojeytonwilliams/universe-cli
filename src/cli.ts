import { BadArgumentsError, CliError } from "./errors/cli-errors.js";
import { safeError, safeTrack } from "./ports/observability-client.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import {
  handleCreate,
  handleDeploy,
  handleList,
  handleLogs,
  handlePromote,
  handleRegister,
  handleRollback,
  handleStatus,
  handleTeardown,
} from "./commands.js";
import type { Adapters, CliResult, HandlerResult, Services } from "./commands.js";

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

interface CliDependencies {
  adapters: Adapters;
  cwd: string;
  observability: ObservabilityClient;
  services: Services;
}

type CommandHandler = (
  argv: string[],
  cwd: string,
  deps: {
    services: Services;
    adapters: Adapters;
  },
) => Promise<HandlerResult>;

interface CommandDef {
  context?: (value: string | undefined) => Record<string, string>;
  handler: CommandHandler;
}

const COMMANDS: Record<string, CommandDef> = {
  create: { handler: handleCreate },
  deploy: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: handleDeploy,
  },
  list: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: handleList,
  },
  logs: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: handleLogs,
  },
  promote: {
    context: (value) => ({ targetEnvironment: value ?? "production" }),
    handler: handlePromote,
  },
  register: { handler: handleRegister },
  rollback: {
    context: (value) => ({ targetEnvironment: value ?? "production" }),
    handler: handleRollback,
  },
  status: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: handleStatus,
  },
  teardown: {
    context: (value) => ({ targetEnvironment: value ?? "preview" }),
    handler: handleTeardown,
  },
};

const runCli = async (argv: string[], deps: CliDependencies): Promise<CliResult> => {
  const { observability } = deps;
  const [command] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    return { exitCode: 0, output: HELP_TEXT };
  }

  const def = COMMANDS[command];
  const ctx = def?.context?.(argv[2]) ?? {};

  try {
    if (!def) {
      throw new BadArgumentsError(
        `Unknown command: "${command}". Run "universe --help" for usage.`,
      );
    }

    safeTrack(observability, `${command}.start`, ctx);

    const result = await def.handler(argv, deps.cwd, deps);
    if (result.exitCode === 0) {
      safeTrack(observability, `${command}.success`, { ...ctx, ...result.meta });
    }
    return { exitCode: result.exitCode, output: result.output };
  } catch (error) {
    if (error instanceof CliError) {
      safeError(observability, error);
      safeTrack(observability, `${command}.failure`, ctx);
      return { exitCode: error.exitCode, output: error.message };
    }
    throw error;
  }
};

export { runCli };
export type { CliResult };
