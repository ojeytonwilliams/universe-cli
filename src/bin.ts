#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { BadArgumentsError } from "./errors/cli-errors.js";
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
import { ClackPrompt } from "./prompt/clack-prompt.js";
import { LocalFilesystemWriter } from "./io/local-filesystem-writer.js";
import { LocalProjectReader } from "./io/local-project-reader.js";
import { GitRepoInitialiser } from "./io/git-repo-initialiser.js";
import { PnpmPackageManager } from "./package-manager/pnpm-package-manager.js";
import { BunPackageManager } from "./package-manager/bun-package-manager.js";
import { CreateInputValidationService } from "./services/create-input-validation-service.js";
import { LayerCompositionService } from "./services/layer-composition-service.js";
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
import { PackageManagerService } from "./package-manager/package-manager.service.js";
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
import { runCli } from "./cli.js";

interface RouteDeps {
  cwd: string;
  deployClient: DeployClient;
  filesystemWriter: FilesystemWriter;
  layerResolver: LayerComposer;
  listClient: ListClient;
  logsClient: LogsClient;
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

const bindThunk = (argv: string[], deps: RouteDeps): (() => Promise<unknown>) => {
  const [command] = argv;
  const { cwd } = deps;

  if (command === undefined) {
    throw new BadArgumentsError(`Unknown command: "". Run "universe --help" for usage.`);
  }

  switch (command) {
    case "create":
      if (argv.length > 1) {
        throw new BadArgumentsError(
          'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
        );
      }
      return () => handleCreate(cwd, deps);

    case "deploy":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe deploy [directory]");
      }
      return () => handleDeploy({ projectDirectory: argv[1] ?? cwd }, deps);

    case "list":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe list [directory]");
      }
      return () => handleList({ projectDirectory: argv[1] ?? cwd }, deps);

    case "logs": {
      if (argv.length > 3) {
        throw new BadArgumentsError(
          "Too many arguments. Usage: universe logs [directory] [environment]",
        );
      }
      const logsEnv = argv[2] ?? "preview";
      if (!VALID_ENVIRONMENTS.has(logsEnv)) {
        throw new BadArgumentsError(
          `environment "${logsEnv}" — valid values are: preview, production`,
        );
      }
      return () => handleLogs({ environment: logsEnv, projectDirectory: argv[1] ?? cwd }, deps);
    }

    case "promote":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe promote [directory]");
      }
      return () => handlePromote({ projectDirectory: argv[1] ?? cwd }, deps);

    case "register":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe register [directory]");
      }
      return () => handleRegister({ projectDirectory: argv[1] ?? cwd }, deps);

    case "rollback":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe rollback [directory]");
      }
      return () => handleRollback({ projectDirectory: argv[1] ?? cwd }, deps);

    case "status": {
      if (argv.length > 3) {
        throw new BadArgumentsError(
          "Too many arguments. Usage: universe status [directory] [environment]",
        );
      }
      const statusEnv = argv[2] ?? "preview";
      if (!VALID_ENVIRONMENTS.has(statusEnv)) {
        throw new BadArgumentsError(
          `environment "${statusEnv}" — valid values are: preview, production`,
        );
      }
      return () => handleStatus({ environment: statusEnv, projectDirectory: argv[1] ?? cwd }, deps);
    }

    case "teardown":
      if (argv.length > 2) {
        throw new BadArgumentsError("Too many arguments. Usage: universe teardown [directory]");
      }
      return () => handleTeardown({ projectDirectory: argv[1] ?? cwd }, deps);

    default:
      throw new BadArgumentsError(
        `Unknown command: "${command}". Run "universe --help" for usage.`,
      );
  }
};

const route = async (
  argv: string[],
  deps: RouteDeps,
  observability: ObservabilityClient,
): Promise<CliResult> => {
  const [command] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    return { exitCode: 0, output: HELP_TEXT };
  }

  let thunk: () => Promise<unknown>;
  try {
    thunk = bindThunk(argv, deps);
  } catch (error) {
    if (error instanceof BadArgumentsError) {
      return { exitCode: error.exitCode, output: error.message };
    }
    throw error;
  }

  const result = await runCli(command, thunk as () => Promise<HandlerResult>, observability);
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const deps: RouteDeps = {
    cwd: process.cwd(),
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
  const observability = new StubObservabilityClient();
  const { exitCode, output } = await route(process.argv.slice(2), deps, observability);

  if (output.length > 0) {
    process.stdout.write(`${output}\n`);
  }

  process.exitCode = exitCode;
}

export { route };
export type { RouteDeps };
