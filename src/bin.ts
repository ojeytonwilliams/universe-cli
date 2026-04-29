#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { isSea } from "node:sea";
import pkg from "../package.json" with { type: "json" };
import type { DeviceFlow } from "./auth/device-flow.port.js";
import type { IdentityResolver } from "./auth/identity-resolver.port.js";
import type { TokenStore } from "./auth/token-store.port.js";
import { FileTokenStore } from "./auth/file-token-store.js";
import { GithubDeviceFlow } from "./auth/github-device-flow.js";
import { GithubIdentityResolver } from "./auth/github-identity-resolver.js";
import { DEFAULT_PROXY_URL } from "./constants.js";
import { BadArgumentsError } from "./errors/cli-errors.js";
import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { RepoInitialiser } from "./io/repo-initialiser.port.js";
import { GitRepoInitialiser } from "./io/git-repo-initialiser.js";
import { LocalFilesystemWriter } from "./io/local-filesystem-writer.js";
import { LocalProjectReader } from "./io/local-project-reader.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import { StubObservabilityClient } from "./observability/observability-client.stub.js";
import type { LogsClient } from "./platform/logs-client.port.js";
import { StubLogsClient } from "./platform/logs-client.stub.js";
import { createProxyClient } from "./platform/http-proxy-client.js";
import type { ProxyClient } from "./platform/proxy-client.port.js";
import type { RegistrationClient } from "./platform/registration-client.port.js";
import { StubRegistrationClient } from "./platform/registration-client.stub.js";
import type { StatusClient } from "./platform/status-client.port.js";
import { StubStatusClient } from "./platform/status-client.stub.js";
import type { TeardownClient } from "./platform/teardown-client.port.js";
import { StubTeardownClient } from "./platform/teardown-client.stub.js";
import type { LayerComposer } from "./commands/create/layer-composition/layer-composition-service.js";
import { LayerCompositionService } from "./commands/create/layer-composition/layer-composition-service.js";
import type { CreateInputValidator } from "./commands/create/create-input-validation-service.js";
import { CreateInputValidationService } from "./commands/create/create-input-validation-service.js";
import type { PackageManager } from "./commands/create/package-manager/package-manager.service.js";
import { PackageManagerService } from "./commands/create/package-manager/package-manager.service.js";
import { BunPackageManager } from "./commands/create/package-manager/bun-package-manager.js";
import { PnpmPackageManager } from "./commands/create/package-manager/pnpm-package-manager.js";
import type { PlatformManifestGenerator } from "./services/platform-manifest-service.js";
import { PlatformManifestService } from "./services/platform-manifest-service.js";
import type { ProjectReaderPort } from "./io/project-reader.port.js";
import type { Prompt } from "./commands/create/prompt/prompt.port.js";
import { ClackPrompt } from "./commands/create/prompt/clack-prompt.js";
import { handleCreate } from "./commands/create/index.js";
import type { HandlerResult } from "./commands/create/index.js";
import { handleDeploy } from "./commands/deploy/index.js";
import { handleList } from "./commands/list/index.js";
import { handleLogin } from "./commands/login/index.js";
import { handleLogout } from "./commands/logout/index.js";
import { handleLogs } from "./commands/logs/index.js";
import { handlePromote } from "./commands/promote/index.js";
import { handleRegister } from "./commands/register/index.js";
import { handleRollback } from "./commands/rollback/index.js";
import { handleStatus } from "./commands/status/index.js";
import { handleTeardown } from "./commands/teardown/index.js";
import { handleWhoami } from "./commands/whoami/index.js";
import { runCli } from "./cli.js";

interface RouteDeps {
  deviceFlow: DeviceFlow;
  filesystemWriter: FilesystemWriter;
  identityResolver: IdentityResolver;
  layerResolver: LayerComposer;
  logsClient: LogsClient;
  packageManager: PackageManager;
  platformManifestGenerator: PlatformManifestGenerator;
  projectReader: ProjectReaderPort;
  prompt: Prompt;
  proxyClient: ProxyClient;
  registrationClient: RegistrationClient;
  repoInitialiser: RepoInitialiser;
  statusClient: StatusClient;
  teardownClient: TeardownClient;
  tokenStore: TokenStore;
  validator: CreateInputValidator;
}

interface RouteContext {
  cwd: string;
}

const HELP_TEXT = `
Usage: universe <command> [options]

Static deploy commands (require "static" prefix):
  static deploy    Deploy a project to the platform
  static list      List deployments for a site
  static promote   Promote a deployment to production
  static rollback  Roll back to a previous deployment

Auth commands:
  login       Authenticate with the platform
  logout      Remove stored credentials
  whoami      Show the current authenticated user

Project commands:
  create      Scaffold a new project locally
  register    Register a project with the platform
  logs        View logs for a project
  status      Show the status of a project
  teardown    Remove a project from the platform

Options:
  --help      Show this help message
  --json      Output results as JSON
`.trim();

const VALID_ENVIRONMENTS = new Set(["preview", "production"]);

type StaticCommandName = "deploy" | "list" | "promote" | "rollback";
type DirectCommandName =
  | "create"
  | "login"
  | "logout"
  | "logs"
  | "register"
  | "status"
  | "teardown"
  | "whoami";
type CommandName = DirectCommandName | StaticCommandName;

type Environment = "preview" | "production";

interface ParsedOptions {
  dir?: string;
  environment?: Environment;
  force?: boolean;
  from?: string;
  json?: boolean;
  projectDirectory?: string;
  promote?: boolean;
  site?: string;
  to?: string;
}

type ParseArgsResult =
  | { command: "help" | "version" | CommandName; error?: never; options: ParsedOptions }
  | { command?: never; error: BadArgumentsError; options?: never };

type ArgParser = (args: string[], command: CommandName) => ParseArgsResult;
type HandlerThunk = () => Promise<HandlerResult>;
type HandlerBinder = (
  options: ParsedOptions,
  context: RouteContext,
  deps: RouteDeps,
) => HandlerThunk;

const STATIC_COMMANDS = new Set<string>(["deploy", "list", "promote", "rollback"]);
const isStaticCommandName = (value: string): value is StaticCommandName =>
  STATIC_COMMANDS.has(value);

const DIRECT_COMMANDS = new Set<string>([
  "create",
  "login",
  "logout",
  "logs",
  "register",
  "status",
  "teardown",
  "whoami",
]);
const isDirectCommandName = (value: string): value is DirectCommandName =>
  DIRECT_COMMANDS.has(value);

const parseStaticDeploy = (args: string[]): ParseArgsResult => {
  const options: ParsedOptions = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--promote") {
      options.promote = true;
      i++;
    } else if (arg === "--dir") {
      const val = args[i + 1];
      if (val === undefined || val.startsWith("--")) {
        return {
          error: new BadArgumentsError(
            "--dir requires a value. Usage: universe static deploy [--promote] [--dir <dir>]",
          ),
        };
      }
      options.dir = val;
      i += 2;
    } else {
      return {
        error: new BadArgumentsError(
          `Unexpected argument: "${arg}". Usage: universe static deploy [--promote] [--dir <dir>]`,
        ),
      };
    }
  }
  return { command: "deploy", options };
};

const parseStaticPromote = (args: string[]): ParseArgsResult => {
  if (args.length === 0) {
    return { command: "promote", options: {} };
  }
  const fromIdx = args.indexOf("--from");
  if (fromIdx === -1) {
    return {
      error: new BadArgumentsError(
        "Unknown argument. Usage: universe static promote [--from <deployId>]",
      ),
    };
  }
  const from = args[fromIdx + 1];
  if (from === undefined || from.startsWith("--")) {
    return {
      error: new BadArgumentsError(
        "--from requires a value. Usage: universe static promote [--from <deployId>]",
      ),
    };
  }
  const remaining = args.filter((_, idx) => idx !== fromIdx && idx !== fromIdx + 1);
  if (remaining.length > 0) {
    return {
      error: new BadArgumentsError(
        `Unexpected arguments: ${remaining.join(" ")}. Usage: universe static promote [--from <deployId>]`,
      ),
    };
  }
  return { command: "promote", options: { from } };
};

const parseStaticRollback = (args: string[]): ParseArgsResult => {
  const toIdx = args.indexOf("--to");
  if (toIdx === -1) {
    return {
      error: new BadArgumentsError(
        "--to <deployId> is required. Usage: universe static rollback --to <deployId>",
      ),
    };
  }
  const to = args[toIdx + 1];
  if (to === undefined || to.startsWith("--")) {
    return {
      error: new BadArgumentsError(
        "--to requires a value. Usage: universe static rollback --to <deployId>",
      ),
    };
  }
  const remaining = args.filter((_, i) => i !== toIdx && i !== toIdx + 1);
  if (remaining.length > 0) {
    return {
      error: new BadArgumentsError(
        `Unexpected arguments: ${remaining.join(" ")}. Usage: universe static rollback --to <deployId>`,
      ),
    };
  }
  return { command: "rollback", options: { to } };
};

const parseStaticList = (args: string[]): ParseArgsResult => {
  if (args.length === 0) {
    return { command: "list", options: {} };
  }
  const siteIdx = args.indexOf("--site");
  if (siteIdx === -1) {
    return {
      error: new BadArgumentsError("Unknown argument. Usage: universe static list [--site <site>]"),
    };
  }
  const site = args[siteIdx + 1];
  if (site === undefined || site.startsWith("--")) {
    return {
      error: new BadArgumentsError(
        "--site requires a value. Usage: universe static list [--site <site>]",
      ),
    };
  }
  const remaining = args.filter((_, i) => i !== siteIdx && i !== siteIdx + 1);
  if (remaining.length > 0) {
    return {
      error: new BadArgumentsError(`Unexpected arguments: ${remaining.join(" ")}`),
    };
  }
  return { command: "list", options: { site } };
};

const staticParsers: Record<StaticCommandName, (args: string[]) => ParseArgsResult> = {
  deploy: parseStaticDeploy,
  list: parseStaticList,
  promote: parseStaticPromote,
  rollback: parseStaticRollback,
};

const parseStaticNamespace = (args: string[]): ParseArgsResult => {
  const [subCommand, ...rest] = args;
  if (subCommand === undefined) {
    return {
      error: new BadArgumentsError(
        "Usage: universe static <command>  Commands: deploy, list, promote, rollback",
      ),
    };
  }
  if (!isStaticCommandName(subCommand)) {
    return {
      error: new BadArgumentsError(
        `Unknown static command: "${subCommand}". Commands: deploy, list, promote, rollback`,
      ),
    };
  }
  return staticParsers[subCommand](rest);
};

const parseLoginArgs: ArgParser = (args) => {
  let force = false;
  for (const arg of args) {
    if (arg === "--force") {
      force = true;
    } else {
      return {
        error: new BadArgumentsError(`Unknown argument: "${arg}". Usage: universe login [--force]`),
      };
    }
  }
  return { command: "login", options: { force } };
};

const parseLogoutArgs: ArgParser = (args) => {
  if (args.length > 0) {
    return { error: new BadArgumentsError("Usage: universe logout") };
  }
  return { command: "logout", options: {} };
};

const parseWhoamiArgs: ArgParser = (args) => {
  if (args.length > 0) {
    return { error: new BadArgumentsError("Usage: universe whoami") };
  }
  return { command: "whoami", options: {} };
};

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

  return { command, options };
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

const directArgParsers: Record<DirectCommandName, ArgParser> = {
  create: parseCreateArgs,
  login: parseLoginArgs,
  logout: parseLogoutArgs,
  logs: parseEnvironmentArgs,
  register: parseSingleDirectoryArg,
  status: parseEnvironmentArgs,
  teardown: parseSingleDirectoryArg,
  whoami: parseWhoamiArgs,
};

const handlerBinders: Record<CommandName, HandlerBinder> = {
  create: (_options, context, deps) => () => handleCreate({ cwd: context.cwd }, deps),
  deploy: (options, context, deps) => () =>
    handleDeploy(
      {
        cwd: context.cwd,
        json: options.json ?? false,
        ...(options.dir !== undefined && { dir: options.dir }),
        ...(options.promote !== undefined && { promote: options.promote }),
      },
      { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
    ),
  list: (options, context, deps) => () =>
    handleList(
      {
        cwd: context.cwd,
        json: options.json ?? false,
        ...(options.site !== undefined && { site: options.site }),
      },
      { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
    ),
  login: (options, _context, deps) => () =>
    handleLogin(
      { force: options.force ?? false, json: options.json ?? false },
      {
        deviceFlow: deps.deviceFlow,
        identityResolver: deps.identityResolver,
        tokenStore: deps.tokenStore,
      },
    ),
  logout: (options, _context, deps) => () =>
    handleLogout({ json: options.json ?? false }, { tokenStore: deps.tokenStore }),
  logs: (options, context, deps) => () =>
    handleLogs(
      {
        environment: options.environment ?? "preview",
        projectDirectory: options.projectDirectory ?? context.cwd,
      },
      deps,
    ),
  promote: (options, context, deps) => () =>
    handlePromote(
      {
        cwd: context.cwd,
        json: options.json ?? false,
        ...(options.from !== undefined && { from: options.from }),
      },
      { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
    ),
  register: (options, context, deps) => () =>
    handleRegister({ projectDirectory: options.projectDirectory ?? context.cwd }, deps),
  rollback: (options, context, deps) => () =>
    handleRollback(
      { cwd: context.cwd, json: options.json ?? false, to: options.to },
      { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
    ),
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
  whoami: (options, _context, deps) => () =>
    handleWhoami(
      { json: options.json ?? false },
      { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
    ),
};

const parseArgs = (argv: string[]): ParseArgsResult => {
  // Extract --json globally — it may appear before the command token
  const withoutJson = argv.filter((a) => a !== "--json");
  const json = withoutJson.length !== argv.length;

  const [commandToken, ...args] = withoutJson;

  if (commandToken === undefined || commandToken === "--help" || commandToken === "-h") {
    return { command: "help", options: {} };
  }

  if (commandToken === "--version" || commandToken === "-V") {
    return { command: "version", options: {} };
  }

  if (commandToken === "static") {
    const result = parseStaticNamespace(args);
    if (result.error !== undefined) {
      return result;
    }
    return {
      command: result.command,
      options: json ? { ...result.options, json } : result.options,
    };
  }

  if (isStaticCommandName(commandToken)) {
    return {
      error: new BadArgumentsError(
        `"${commandToken}" is a static subcommand. Use: universe static ${commandToken}`,
      ),
    };
  }

  if (!isDirectCommandName(commandToken)) {
    return {
      error: new BadArgumentsError(
        `Unknown command: "${commandToken}". Run "universe --help" for usage.`,
      ),
    };
  }

  const result = directArgParsers[commandToken](args, commandToken);
  if (result.error !== undefined) {
    return result;
  }
  return {
    command: result.command,
    options: json ? { ...result.options, json } : result.options,
  };
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

  if (parseResult.command === "version") {
    return { exitCode: 0, output: pkg.version };
  }

  if (parseResult.error !== undefined) {
    return { exitCode: parseResult.error.exitCode, output: parseResult.error.message };
  }

  const thunk = bindHandler(parseResult.command, parseResult.options, context, deps);
  const result = await runCli(parseResult.command, thunk, observability);
  return result;
};

if (isSea() || process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokenStore = new FileTokenStore();
  const identityResolver = new GithubIdentityResolver({
    loadStoredToken: () => tokenStore.loadToken(),
  });
  const proxyClient = createProxyClient({
    baseUrl: process.env["UNIVERSE_PROXY_URL"] ?? DEFAULT_PROXY_URL,
    getAuthToken: async () => {
      const identity = await identityResolver.resolve();
      return identity?.token ?? "";
    },
  });

  const deps: RouteDeps = {
    deviceFlow: new GithubDeviceFlow(),
    filesystemWriter: new LocalFilesystemWriter(),
    identityResolver,
    layerResolver: new LayerCompositionService(),
    logsClient: new StubLogsClient(),
    packageManager: new PackageManagerService({
      bun: new BunPackageManager(),
      pnpm: new PnpmPackageManager(),
    }),
    platformManifestGenerator: new PlatformManifestService(),
    projectReader: new LocalProjectReader(),
    prompt: new ClackPrompt(),
    proxyClient,
    registrationClient: new StubRegistrationClient(),
    repoInitialiser: new GitRepoInitialiser(),
    statusClient: new StubStatusClient(),
    teardownClient: new StubTeardownClient(),
    tokenStore,
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
