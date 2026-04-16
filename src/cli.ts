import { BadArgumentsError, CliError } from "./errors/cli-errors.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import type { DeployClient } from "./platform/deploy-client.port.js";
import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { ListClient } from "./platform/list-client.port.js";
import type { RepoInitialiser } from "./io/repo-initialiser.port.js";
import type { PromoteClient } from "./platform/promote-client.port.js";
import type { Prompt } from "./prompt/prompt.port.js";
import type { ProjectReaderPort } from "./io/project-reader.port.js";
import type { RegistrationClient } from "./platform/registration-client.port.js";
import type { RollbackClient } from "./platform/rollback-client.port.js";
import type { StatusClient } from "./platform/status-client.port.js";
import type { TeardownClient } from "./platform/teardown-client.port.js";
import type { LogsClient } from "./platform/logs-client.port.js";
import type { LayerComposer } from "./services/layer-composition-service.js";
import type { PlatformManifestGenerator } from "./services/platform-manifest-service.js";
import type { CreateInputValidator } from "./services/create-input-validation-service.js";
import type { PackageManagerRunner } from "./package-manager/package-manager.service.js";
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
import type { CliResult, HandlerResult } from "./commands.js";

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
  cwd: string;
  deployClient: DeployClient;
  filesystemWriter: FilesystemWriter;
  layerResolver: LayerComposer;
  listClient: ListClient;
  logsClient: LogsClient;
  observability: ObservabilityClient;
  packageManager: PackageManagerRunner;
  platformManifestGenerator: PlatformManifestGenerator;
  projectReader: ProjectReaderPort;
  prompt: Prompt;
  promoteClient: PromoteClient;
  registrationClient: RegistrationClient;
  repoInitialiser: RepoInitialiser;
  rollbackClient: RollbackClient;
  statusClient: StatusClient;
  teardownClient: TeardownClient;
  validator: CreateInputValidator;
}

type CommandHandler = (
  argv: string[],
  cwd: string,
  deps: CliDependencies,
) => Promise<HandlerResult>;

interface CommandDef {
  context?: (value: string | undefined) => Record<string, string>;
  handler: CommandHandler;
}

const COMMANDS: Record<string, CommandDef> = {
  create: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 1) {
        throw new BadArgumentsError(
          'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
        );
      }
      return handleCreate(cwd, deps);
    },
  },
  deploy: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe deploy [directory]");
      }
      return handleDeploy({ projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  list: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe list [directory]");
      }
      return handleList({ projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  logs: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: (argv, cwd, deps) => {
      if (argv.length > 3) {
        throw new BadArgumentsError(
          "Too many arguments. Usage: universe logs [directory] [environment]",
        );
      }
      const environment = argv[2] ?? "preview";
      if (environment !== "preview" && environment !== "production") {
        throw new BadArgumentsError(
          `environment "${environment}" — valid values are: preview, production`,
        );
      }
      return handleLogs({ environment, projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  promote: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe promote [directory]");
      }
      return handlePromote({ projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  register: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe register [directory]");
      }
      return handleRegister({ projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  rollback: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe rollback [directory]");
      }
      return handleRollback({ projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  status: {
    context: (value) => ({ environment: value ?? "preview" }),
    handler: (argv, cwd, deps) => {
      if (argv.length > 3) {
        throw new BadArgumentsError(
          "Too many arguments. Usage: universe status [directory] [environment]",
        );
      }
      const environment = argv[2] ?? "preview";
      if (environment !== "preview" && environment !== "production") {
        throw new BadArgumentsError(
          `environment "${environment}" — valid values are: preview, production`,
        );
      }
      return handleStatus({ environment, projectDirectory: argv[1] ?? cwd }, deps);
    },
  },
  teardown: {
    handler: (argv, cwd, deps) => {
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe teardown [directory]");
      }
      return handleTeardown({ projectDirectory: argv[1] ?? cwd }, deps);
    },
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

    observability.safeTrack(`${command}.start`, ctx);

    const result = await def.handler(argv, deps.cwd, deps);
    if (result.exitCode === 0) {
      observability.safeTrack(`${command}.success`, { ...ctx, ...result.meta });
    }
    return { exitCode: result.exitCode, output: result.output };
  } catch (error) {
    if (error instanceof CliError) {
      observability.safeError(error);
      observability.safeTrack(`${command}.failure`, ctx);
      return { exitCode: error.exitCode, output: error.message };
    }
    throw error;
  }
};

export { runCli };
export type { CliResult };
