import { join } from "node:path";
import {
  CliError,
  DeferredCommandError,
  ManifestInvalidError,
  UnsupportedCombinationError,
} from "./errors/cli-errors.js";
import type { DeployReceipt, DeployRequest } from "./ports/deploy-client.js";
import type { PromoteReceipt, PromoteRequest } from "./ports/promote-client.js";
import type { ListRequest, ListResponse } from "./ports/list-client.js";
import type { RollbackReceipt, RollbackRequest } from "./ports/rollback-client.js";
import type { StatusRequest, StatusResponse } from "./ports/status-client.js";
import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import { safeError, safeTrack } from "./ports/observability-client.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import type { PlatformManifest } from "./services/platform-manifest-service.js";

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
  cwd: string;
  deployClient: { deploy(request: DeployRequest): Promise<DeployReceipt> };
  filesystemWriter: FilesystemWriter;
  layerResolver: { resolveLayers(input: CreateSelections): ResolvedLayerSet };
  listClient: { getList(request: ListRequest): Promise<ListResponse> };
  logsClient: {
    getLogs(request: { environment: string; manifest: PlatformManifest }): Promise<{
      entries: { level: string; message: string; timestamp: string }[];
      environment: string;
      name: string;
    }>;
  };
  observability: ObservabilityClient;
  platformManifestGenerator: {
    generatePlatformManifest(input: CreateSelections): string;
    validateManifest(yaml: string): PlatformManifest;
  };
  projectReader: { readFile(filePath: string): Promise<string> };
  promoteClient: { promote(request: PromoteRequest): Promise<PromoteReceipt> };
  promptPort: PromptPort;
  rollbackClient: { rollback(request: RollbackRequest): Promise<RollbackReceipt> };
  registrationClient: {
    register(manifest: PlatformManifest): Promise<{ name: string; registrationId: string }>;
  };
  statusClient: { getStatus(request: StatusRequest): Promise<StatusResponse> };
  validator: { validateCreateInput(input: CreateSelections): CreateSelections };
}

const DEFERRED_COMMANDS = new Set(["teardown"]);

const runCli = async (argv: string[], deps: CliDependencies): Promise<CliResult> => {
  const {
    cwd,
    deployClient,
    filesystemWriter,
    layerResolver,
    listClient,
    logsClient,
    observability,
    platformManifestGenerator,
    projectReader,
    promoteClient,
    promptPort,
    registrationClient,
    rollbackClient,
    statusClient,
    validator,
  } = deps;
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
      const resolvedLayers = layerResolver.resolveLayers(validatedInput);
      const targetDirectory = join(cwd, validatedInput.name);
      const projectFiles = {
        ...resolvedLayers.files,
        "platform.yaml": platformManifestGenerator.generatePlatformManifest(validatedInput),
      };

      await filesystemWriter.writeProject(targetDirectory, projectFiles);

      return {
        exitCode: 0,
        output: `Scaffolded project at ${targetDirectory}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "register") {
    if (argv.length > 2) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe register [directory]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const receipt = await registrationClient.register(manifest);

      return {
        exitCode: 0,
        output: `Registered project "${receipt.name}". Registration ID: ${receipt.registrationId}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "deploy") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe deploy [directory] [environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const environment = argv[2] ?? "preview";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (environment !== "preview" && environment !== "production") {
      const envError = new UnsupportedCombinationError(
        `environment "${environment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "deploy.start", { environment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const receipt = await deployClient.deploy({ environment, manifest });

      safeTrack(observability, "deploy.success", { environment, name: receipt.name });

      return {
        exitCode: 0,
        output: `Deployed project "${receipt.name}" to ${receipt.environment}. Deployment ID: ${receipt.deploymentId}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "deploy.failure", { environment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "promote") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe promote [directory] [target-environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const targetEnvironment = argv[2] ?? "production";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
      const envError = new UnsupportedCombinationError(
        `target-environment "${targetEnvironment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "promote.start", { targetEnvironment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const receipt = await promoteClient.promote({ manifest, targetEnvironment });

      safeTrack(observability, "promote.success", { name: receipt.name, targetEnvironment });

      return {
        exitCode: 0,
        output: `Promoted project "${receipt.name}" to ${receipt.targetEnvironment}. Promotion ID: ${receipt.promotionId}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "promote.failure", { targetEnvironment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "rollback") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe rollback [directory] [target-environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const targetEnvironment = argv[2] ?? "production";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
      const envError = new UnsupportedCombinationError(
        `target-environment "${targetEnvironment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "rollback.start", { targetEnvironment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const receipt = await rollbackClient.rollback({ manifest, targetEnvironment });

      safeTrack(observability, "rollback.success", { name: receipt.name, targetEnvironment });

      return {
        exitCode: 0,
        output: `Rolled back project "${receipt.name}" to ${receipt.targetEnvironment}. Rollback ID: ${receipt.rollbackId}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "rollback.failure", { targetEnvironment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "logs") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe logs [directory] [environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const environment = argv[2] ?? "preview";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (environment !== "preview" && environment !== "production") {
      const envError = new UnsupportedCombinationError(
        `environment "${environment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "logs.start", { environment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const response = await logsClient.getLogs({ environment, manifest });

      safeTrack(observability, "logs.success", { environment, name: response.name });

      const renderedEntries = response.entries
        .map((e) => `${e.timestamp} [${e.level}] ${e.message}`)
        .join("\n");

      return {
        exitCode: 0,
        output: `Logs for project "${response.name}" in ${response.environment}:\n${renderedEntries}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "logs.failure", { environment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "list") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe list [directory] [environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const environment = argv[2] ?? "preview";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (environment !== "preview" && environment !== "production") {
      const envError = new UnsupportedCombinationError(
        `environment "${environment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "list.start", { environment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const response = await listClient.getList({ environment, manifest });

      safeTrack(observability, "list.success", { environment, name: response.name });

      const renderedEntries = response.deployments
        .map((d) => `  ${d.deploymentId} — ${d.state} (deployed: ${d.deployedAt})`)
        .join("\n");

      return {
        exitCode: 0,
        output: `Deployments for project "${response.name}" in ${response.environment}:\n${renderedEntries}`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "list.failure", { environment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  if (command === "status") {
    if (argv.length > 3) {
      return {
        exitCode: 1,
        output: "Too many arguments. Usage: universe status [directory] [environment]",
      };
    }

    const platformYamlDir = argv[1] ?? cwd;
    const environment = argv[2] ?? "preview";
    const platformYamlPath = join(platformYamlDir, "platform.yaml");

    if (environment !== "preview" && environment !== "production") {
      const envError = new UnsupportedCombinationError(
        `environment "${environment}" — valid values are: preview, production`,
      );
      return { exitCode: envError.exitCode, output: envError.message };
    }

    safeTrack(observability, "status.start", { environment });

    try {
      const yaml = await projectReader.readFile(platformYamlPath);

      let manifest: PlatformManifest;
      try {
        manifest = platformManifestGenerator.validateManifest(yaml);
      } catch (validationError) {
        const invalidError = new ManifestInvalidError(
          platformYamlPath,
          validationError instanceof Error ? validationError.message : String(validationError),
        );
        safeError(observability, invalidError);
        return { exitCode: invalidError.exitCode, output: invalidError.message };
      }

      const response = await statusClient.getStatus({ environment, manifest });

      safeTrack(observability, "status.success", { environment, name: response.name });

      return {
        exitCode: 0,
        output: `Status of project "${response.name}" in ${response.environment}: ${response.state} (last updated: ${response.updatedAt})`,
      };
    } catch (error) {
      if (error instanceof CliError) {
        safeError(observability, error);
        safeTrack(observability, "status.failure", { environment });
        return { exitCode: error.exitCode, output: error.message };
      }

      throw error;
    }
  }

  return { exitCode: 1, output: `Unknown command: "${command}". Run "universe --help" for usage.` };
};

export { runCli };
export type { CliResult };
