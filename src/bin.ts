#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { isSea } from "node:sea";
import { BadArgumentsError } from "./errors/cli-errors.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import type { DeployClient } from "./platform/deploy-client.port.js";
import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { ListClient } from "./platform/list-client.port.js";
import type { RepoInitialiser } from "./io/repo-initialiser.port.js";
import type { PromoteClient } from "./platform/promote-client.port.js";
import type { Prompt } from "./commands/create/prompt/prompt.port.js";
import type { ProjectReaderPort } from "./io/project-reader.port.js";
import type { RegistrationClient } from "./platform/registration-client.port.js";
import type { RollbackClient } from "./platform/rollback-client.port.js";
import type { StatusClient } from "./platform/status-client.port.js";
import type { TeardownClient } from "./platform/teardown-client.port.js";
import type { LogsClient } from "./platform/logs-client.port.js";
import type { LayerComposer } from "./commands/create/layer-composition/layer-composition-service.js";
import type { PlatformManifestGenerator } from "./services/platform-manifest-service.js";
import type { CreateInputValidator } from "./commands/create/create-input-validation-service.js";
import type { PackageManager } from "./commands/create/package-manager/package-manager.service.js";
import { ClackPrompt } from "./commands/create/prompt/clack-prompt.js";
import { LocalFilesystemWriter } from "./io/local-filesystem-writer.js";
import { LocalProjectReader } from "./io/local-project-reader.js";
import { GitRepoInitialiser } from "./io/git-repo-initialiser.js";
import { PnpmPackageManager } from "./commands/create/package-manager/pnpm-package-manager.js";
import { BunPackageManager } from "./commands/create/package-manager/bun-package-manager.js";
import { CreateInputValidationService } from "./commands/create/create-input-validation-service.js";
import { LayerCompositionService } from "./commands/create/layer-composition/layer-composition-service.js";
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
import { PackageManagerService } from "./commands/create/package-manager/package-manager.service.js";
import { handleCreate } from "./commands/create/index.js";
import { handleRegister } from "./commands/register/index.js";
import { handleDeploy } from "./commands/deploy/index.js";
import { handlePromote } from "./commands/promote/index.js";
import { handleRollback } from "./commands/rollback/index.js";
import { handleLogs } from "./commands/logs/index.js";
import { handleList } from "./commands/list/index.js";
import { handleStatus } from "./commands/status/index.js";
import { handleTeardown } from "./commands/teardown/index.js";
import type { HandlerResult } from "./commands/create/index.js";
import { runCli } from "./cli.js";

interface RouteDeps {
  deployClient: DeployClient;
  filesystemWriter: FilesystemWriter;
  layerResolver: LayerComposer;
  listClient: ListClient;
  logsClient: LogsClient;
  packageManager: PackageManager;
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

interface RouteContext {
  cwd: string;
}

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

const VALID_ENVIRONMENTS = new Set(["preview", "production"]);

type CommandName =
  | "create"
  | "deploy"
  | "list"
  | "logs"
  | "promote"
  | "register"
  | "rollback"
  | "status"
  | "teardown";

type Environment = "preview" | "production";

interface ParsedOptions {
  environment?: Environment;
  projectDirectory?: string;
}

type ParseArgsResult =
  | { command: "help" | CommandName; error?: never; options: ParsedOptions }
  | { command?: never; error: BadArgumentsError; options?: never };

type ArgParser = (args: string[], command: CommandName) => ParseArgsResult;
type HandlerThunk = () => Promise<HandlerResult>;
type HandlerBinder = (
  options: ParsedOptions,
  context: RouteContext,
  deps: RouteDeps,
) => HandlerThunk;

const parseSingleDirectoryArg: ArgParser = (args, command) => {
  if (args.length > 1) {
    return {
      error: new BadArgumentsError(`Too many arguments. Usage: universe ${command} [directory]`),
    };
  }

  const options: ParsedOptions = {};
  const [projectDirectory] = args;
  if (projectDirectory !== undefined) {
    options.projectDirectory = projectDirectory;
  }

  return {
    command,
    options,
  };
};

const parseCreateArgs: ArgParser = (args, command) => {
  if (args.length > 0) {
    return {
      error: new BadArgumentsError(
        'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
      ),
    };
  }

  return { command, options: {} };
};

const parseEnvironmentArgs: ArgParser = (args, command) => {
  if (command !== "logs" && command !== "status") {
    return {
      error: new BadArgumentsError(
        `Internal parser configuration error. Usage: universe ${command} [directory]`,
      ),
    };
  }

  if (args.length > 2) {
    return {
      error: new BadArgumentsError(
        `Too many arguments. Usage: universe ${command} [directory] [environment]`,
      ),
    };
  }

  const environment = args[1] ?? "preview";
  if (!VALID_ENVIRONMENTS.has(environment)) {
    return {
      error: new BadArgumentsError(
        `environment "${environment}" — valid values are: preview, production`,
      ),
    };
  }

  return {
    command,
    options:
      args[0] === undefined
        ? { environment: environment as Environment }
        : { environment: environment as Environment, projectDirectory: args[0] },
  };
};

const argParsers: Record<CommandName, ArgParser> = {
  create: parseCreateArgs,
  deploy: parseSingleDirectoryArg,
  list: parseSingleDirectoryArg,
  logs: parseEnvironmentArgs,
  promote: parseSingleDirectoryArg,
  register: parseSingleDirectoryArg,
  rollback: parseSingleDirectoryArg,
  status: parseEnvironmentArgs,
  teardown: parseSingleDirectoryArg,
};

const handlerBinders: Record<CommandName, HandlerBinder> = {
  create: (_options, context, deps) => () => handleCreate({ cwd: context.cwd }, deps),
  deploy: (options, context, deps) => () =>
    handleDeploy({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  list: (options, context, deps) => () =>
    handleList({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  logs: (options, context, deps) => () =>
    handleLogs(
      {
        environment: options.environment ?? "preview",
        projectDirectory: options.projectDirectory ?? context.cwd,
      },
      deps,
    ),
  promote: (options, context, deps) => () =>
    handlePromote({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  register: (options, context, deps) => () =>
    handleRegister({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  rollback: (options, context, deps) => () =>
    handleRollback({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  status: (options, context, deps) => () =>
    handleStatus(
      {
        environment: options.environment ?? "preview",
        projectDirectory: options.projectDirectory ?? context.cwd,
      },
      deps,
    ),
  teardown: (options, context, deps) => () =>
    handleTeardown({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
};

const isCommandName = (value: string): value is CommandName => value in argParsers;

const parseArgs = (argv: string[]): ParseArgsResult => {
  const [commandToken, ...args] = argv;

  if (commandToken === undefined || commandToken === "--help" || commandToken === "-h") {
    return { command: "help", options: {} };
  }

  if (!isCommandName(commandToken)) {
    return {
      error: new BadArgumentsError(
        `Unknown command: "${commandToken}". Run "universe --help" for usage.`,
      ),
    };
  }

  return argParsers[commandToken](args, commandToken);
};

const bindHandler = (
  command: CommandName,
  options: ParsedOptions,
  context: RouteContext,
  deps: RouteDeps,
): HandlerThunk => handlerBinders[command](options, context, deps);

const route = async (
  argv: string[],
  deps: RouteDeps,
  context: RouteContext,
  observability: ObservabilityClient,
): Promise<{ exitCode: number; output: string }> => {
  const parseResult = parseArgs(argv);
  if (parseResult.command === "help") {
    return { exitCode: 0, output: HELP_TEXT };
  }

  if (parseResult.error !== undefined) {
    return { exitCode: parseResult.error.exitCode, output: parseResult.error.message };
  }

  const thunk = bindHandler(parseResult.command, parseResult.options, context, deps);
  const result = await runCli(parseResult.command, thunk, observability);
  return result;
};

if (isSea() || process.argv[1] === fileURLToPath(import.meta.url)) {
  const deps: RouteDeps = {
    deployClient: new StubDeployClient(),
    filesystemWriter: new LocalFilesystemWriter(),
    layerResolver: new LayerCompositionService(),
    listClient: new StubListClient(),
    logsClient: new StubLogsClient(),
    packageManager: new PackageManagerService({
      bun: new BunPackageManager(),
      pnpm: new PnpmPackageManager(),
    }),
    platformManifestGenerator: new PlatformManifestService(),
    projectReader: new LocalProjectReader(),
    promoteClient: new StubPromoteClient(),
    prompt: new ClackPrompt(),
    registrationClient: new StubRegistrationClient(),
    repoInitialiser: new GitRepoInitialiser(),
    rollbackClient: new StubRollbackClient(),
    statusClient: new StubStatusClient(),
    teardownClient: new StubTeardownClient(),
    validator: new CreateInputValidationService((path) => existsSync(path)),
  };
  const context: RouteContext = { cwd: process.cwd() };
  const observability = new StubObservabilityClient();
  void (async () => {
    const { exitCode, output } = await route(process.argv.slice(2), deps, context, observability);

    if (output.length > 0) {
      process.stdout.write(`${output}\n`);
    }

    process.exitCode = exitCode;
  })();
}

export { parseArgs, route };
export type { RouteDeps };
