import type { ObservabilityClient } from "./observability/observability-client.port.js";
import { handleCreate } from "./commands/create/index.js";
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
import type { DeviceFlow } from "./auth/device-flow.port.js";
import type { IdentityResolver } from "./auth/identity-resolver.port.js";
import type { TokenStore } from "./auth/token-store.port.js";
import { Command, CommanderError } from "commander";
import type { FilesystemWriter } from "./io/filesystem-writer.port.js";
import type { RepoInitialiser } from "./io/repo-initialiser.port.js";
import type { LogsClient } from "./platform/logs-client.port.js";
import type { ProxyClient } from "./platform/proxy-client.port.js";
import type { RegistrationClient } from "./platform/registration-client.port.js";
import type { StatusClient } from "./platform/status-client.port.js";
import type { TeardownClient } from "./platform/teardown-client.port.js";
import type { LayerComposer } from "./commands/create/layer-composition/layer-composition-service.js";
import type { CreateInputValidator } from "./commands/create/create-input-validation-service.js";
import type { PackageManager } from "./commands/create/package-manager/package-manager.service.js";
import type { PlatformManifestGenerator } from "./services/platform-manifest-service.js";
import type { ProjectReaderPort } from "./io/project-reader.port.js";
import type { Prompt } from "./commands/create/prompt/prompt.port.js";
import pkg from "../package.json" with { type: "json" };
import { runCli } from "./cli.js";

const VALID_ENVIRONMENTS = new Set(["preview", "production"]);
type Environment = "preview" | "production";

interface Dependencies {
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

interface Context {
  cwd: string;
}

export const dispatch = async (
  argv: string[],
  deps: Dependencies,
  context: Context,
  observability: ObservabilityClient,
): Promise<{ exitCode: number; output: string }> => {
  let capturedOutput = "";
  let result: { exitCode: number; output: string } | undefined;
  const onResult = (r: { exitCode: number; output: string }) => {
    result = r;
  };

  const program = new Command("universe");
  program
    .exitOverride()
    .configureOutput({
      writeErr: (str) => {
        capturedOutput += str;
      },
      writeOut: (str) => {
        capturedOutput += str;
      },
    })
    .version(pkg.version, "-V, --version", "Show version number");

  // Auth commands
  program
    .command("login")
    .description("Authenticate with GitHub via OAuth device flow")
    .option("--force", "Replace any existing stored token", false)
    .option("--json", "Output as JSON", false)
    .action(async (options: { force: boolean; json: boolean }) => {
      onResult(
        await runCli(
          "login",
          () =>
            handleLogin(
              { force: options.force, json: options.json },
              {
                deviceFlow: deps.deviceFlow,
                identityResolver: deps.identityResolver,
                tokenStore: deps.tokenStore,
              },
            ),
          observability,
        ),
      );
    });

  program
    .command("logout")
    .description("Remove the stored GitHub device-flow token")
    .option("--json", "Output as JSON", false)
    .action(async (options: { json: boolean }) => {
      onResult(
        await runCli(
          "logout",
          () => handleLogout({ json: options.json }, { tokenStore: deps.tokenStore }),
          observability,
        ),
      );
    });

  program
    .command("whoami")
    .description("Show resolved GitHub identity and authorized sites")
    .option("--json", "Output as JSON", false)
    .action(async (options: { json: boolean }) => {
      onResult(
        await runCli(
          "whoami",
          () =>
            handleWhoami(
              { json: options.json },
              { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
            ),
          observability,
        ),
      );
    });

  // Project commands
  program
    .command("create")
    .description("Scaffold a new project locally")
    .argument("[args...]", "additional arguments")
    .action(async (args: string[]) => {
      if (args.length > 0) {
        onResult({
          exitCode: 1,
          output:
            'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
        });
        return;
      }
      onResult(
        await runCli("create", () => handleCreate({ cwd: context.cwd }, deps), observability),
      );
    });

  program
    .command("register")
    .description("Register a project with the platform")
    .argument("[directory]", "Project directory")
    .allowExcessArguments(false)
    .action(async (directory: string | undefined) => {
      onResult(
        await runCli(
          "register",
          () => handleRegister({ projectDirectory: directory ?? context.cwd }, deps),
          observability,
        ),
      );
    });

  program
    .command("logs")
    .description("View logs for a project")
    .argument("[directory]", "Project directory")
    .argument("[environment]", "Environment (preview|production)")
    .allowExcessArguments(false)
    .action(async (directory: string | undefined, environment: string | undefined) => {
      const env = environment ?? "preview";
      if (!VALID_ENVIRONMENTS.has(env)) {
        onResult({
          exitCode: 1,
          output: `environment "${env}" — valid values are: preview, production`,
        });
        return;
      }
      onResult(
        await runCli(
          "logs",
          () =>
            handleLogs(
              { environment: env as Environment, projectDirectory: directory ?? context.cwd },
              deps,
            ),
          observability,
        ),
      );
    });

  program
    .command("status")
    .description("Show the status of a project")
    .argument("[directory]", "Project directory")
    .argument("[environment]", "Environment (preview|production)")
    .allowExcessArguments(false)
    .action(async (directory: string | undefined, environment: string | undefined) => {
      const env = environment ?? "preview";
      if (!VALID_ENVIRONMENTS.has(env)) {
        onResult({
          exitCode: 1,
          output: `environment "${env}" — valid values are: preview, production`,
        });
        return;
      }
      onResult(
        await runCli(
          "status",
          () =>
            handleStatus(
              { environment: env as Environment, projectDirectory: directory ?? context.cwd },
              deps,
            ),
          observability,
        ),
      );
    });

  program
    .command("teardown")
    .description("Remove a project from the platform")
    .argument("[directory]", "Project directory")
    .allowExcessArguments(false)
    .action(async (directory: string | undefined) => {
      onResult(
        await runCli(
          "teardown",
          () => handleTeardown({ projectDirectory: directory ?? context.cwd }, deps),
          observability,
        ),
      );
    });

  // Static commands
  const staticCmd = new Command("static")
    .description("Static site deployment commands")
    .exitOverride();

  staticCmd
    .command("deploy")
    .description("Deploy static site via the artemis proxy")
    .option("--dir <dir>", "Override build.output dir from platform.yaml")
    .option("--promote", "Finalize as production (default: preview)", false)
    .option("--json", "Output as JSON", false)
    .allowExcessArguments(false)
    .action(async (options: { dir?: string; promote: boolean; json: boolean }) => {
      onResult(
        await runCli(
          "deploy",
          () =>
            handleDeploy(
              {
                cwd: context.cwd,
                json: options.json,
                ...(options.dir !== undefined && { dir: options.dir }),
                ...(options.promote && { promote: options.promote }),
              },
              { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
            ),
          observability,
        ),
      );
    });

  staticCmd
    .command("ls")
    .description("List recent deploys for a site")
    .option("--site <site>", "Override site from platform.yaml")
    .option("--json", "Output as JSON", false)
    .allowExcessArguments(false)
    .action(async (options: { site?: string; json: boolean }) => {
      onResult(
        await runCli(
          "list",
          () =>
            handleList(
              {
                cwd: context.cwd,
                json: options.json,
                ...(options.site !== undefined && { site: options.site }),
              },
              { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
            ),
          observability,
        ),
      );
    });

  staticCmd
    .command("promote")
    .description("Promote the current preview to production")
    .option("--from <deployId>", "Promote a specific past deploy id (alias rewrite)")
    .option("--json", "Output as JSON", false)
    .allowExcessArguments(false)
    .action(async (options: { from?: string; json: boolean }) => {
      onResult(
        await runCli(
          "promote",
          () =>
            handlePromote(
              {
                cwd: context.cwd,
                json: options.json,
                ...(options.from !== undefined && { from: options.from }),
              },
              { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
            ),
          observability,
        ),
      );
    });

  staticCmd
    .command("rollback")
    .description("Rewrite production alias to a past deploy")
    .option("--to <deployId>", "Target deploy id (required)")
    .option("--json", "Output as JSON", false)
    .allowExcessArguments(false)
    .action(async (options: { to?: string; json: boolean }) => {
      if (options.to === undefined) {
        onResult({
          exitCode: 1,
          output: "--to <deployId> is required. Usage: universe static rollback --to <deployId>",
        });
        return;
      }
      onResult(
        await runCli(
          "rollback",
          () =>
            handleRollback(
              { cwd: context.cwd, json: options.json, to: options.to },
              { identityResolver: deps.identityResolver, proxyClient: deps.proxyClient },
            ),
          observability,
        ),
      );
    });

  program.addCommand(staticCmd);

  if (argv.length === 0) {
    return { exitCode: 0, output: program.helpInformation().trim() };
  }

  try {
    await program.parseAsync(["node", "universe", ...argv]);
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === "commander.helpDisplayed") {
        return { exitCode: 0, output: capturedOutput.trim() };
      }
      return { exitCode: err.exitCode, output: err.message };
    }
    throw err;
  }

  return result ?? { exitCode: 0, output: program.helpInformation().trim() };
};

export type { Dependencies };
