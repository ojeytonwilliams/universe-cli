import { join } from "node:path";
import { CreateUnsupportedCombinationError, ManifestInvalidError } from "./errors/cli-errors.js";
import type { DeployReceipt, DeployRequest } from "./ports/deploy-client.js";
import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ListRequest, ListResponse } from "./ports/list-client.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { PromoteReceipt, PromoteRequest } from "./ports/promote-client.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";
import type { RollbackReceipt, RollbackRequest } from "./ports/rollback-client.js";
import type { StatusRequest, StatusResponse } from "./ports/status-client.js";
import type { TeardownReceipt, TeardownRequest } from "./ports/teardown-client.js";
import type { ResolvedLayerSet } from "./services/layer-composition-service.js";
import type { PlatformManifest } from "./services/platform-manifest-service.js";

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
  registrationClient: {
    register(manifest: PlatformManifest): Promise<{ name: string; registrationId: string }>;
  };
  rollbackClient: { rollback(request: RollbackRequest): Promise<RollbackReceipt> };
  statusClient: { getStatus(request: StatusRequest): Promise<StatusResponse> };
  teardownClient: { teardown(request: TeardownRequest): Promise<TeardownReceipt> };
  validator: { validateCreateInput(input: CreateSelections): CreateSelections };
}

type HandlerResult = CliResult & { meta?: Record<string, string> };

const readAndValidateManifest = async (
  platformYamlPath: string,
  deps: CliDependencies,
): Promise<PlatformManifest> => {
  const yaml = await deps.projectReader.readFile(platformYamlPath);
  try {
    return deps.platformManifestGenerator.validateManifest(yaml);
  } catch (validationError) {
    throw new ManifestInvalidError(
      platformYamlPath,
      validationError instanceof Error ? validationError.message : String(validationError),
    );
  }
};

const handleCreate = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 1) {
    return {
      exitCode: 1,
      output:
        'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
    };
  }

  const promptResult = await deps.promptPort.promptForCreateInputs();

  if (promptResult === null || !promptResult.confirmed) {
    return { exitCode: 1, output: "Create cancelled before writing files." };
  }

  const validatedInput = deps.validator.validateCreateInput(promptResult);
  const resolvedLayers = deps.layerResolver.resolveLayers(validatedInput);
  const targetDirectory = join(deps.cwd, validatedInput.name);
  const projectFiles = {
    ...resolvedLayers.files,
    "platform.yaml": deps.platformManifestGenerator.generatePlatformManifest(validatedInput),
  };

  await deps.filesystemWriter.writeProject(targetDirectory, projectFiles);

  return { exitCode: 0, output: `Scaffolded project at ${targetDirectory}` };
};

const handleRegister = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 2) {
    return { exitCode: 1, output: "Too many arguments. Usage: universe register [directory]" };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const receipt = await deps.registrationClient.register(manifest);

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Registered project "${receipt.name}". Registration ID: ${receipt.registrationId}`,
  };
};

const handleDeploy = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe deploy [directory] [environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const environment = argv[2] ?? "preview";

  if (environment !== "preview" && environment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `environment "${environment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const receipt = await deps.deployClient.deploy({ environment, manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Deployed project "${receipt.name}" to ${receipt.environment}. Deployment ID: ${receipt.deploymentId}`,
  };
};

const handlePromote = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe promote [directory] [target-environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const targetEnvironment = argv[2] ?? "production";

  if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `target-environment "${targetEnvironment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const receipt = await deps.promoteClient.promote({ manifest, targetEnvironment });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Promoted project "${receipt.name}" to ${receipt.targetEnvironment}. Promotion ID: ${receipt.promotionId}`,
  };
};

const handleRollback = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe rollback [directory] [target-environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const targetEnvironment = argv[2] ?? "production";

  if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `target-environment "${targetEnvironment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const receipt = await deps.rollbackClient.rollback({ manifest, targetEnvironment });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Rolled back project "${receipt.name}" to ${receipt.targetEnvironment}. Rollback ID: ${receipt.rollbackId}`,
  };
};

const handleLogs = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe logs [directory] [environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const environment = argv[2] ?? "preview";

  if (environment !== "preview" && environment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `environment "${environment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const response = await deps.logsClient.getLogs({ environment, manifest });

  const renderedEntries = response.entries
    .map((e) => `${e.timestamp} [${e.level}] ${e.message}`)
    .join("\n");

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Logs for project "${response.name}" in ${response.environment}:\n${renderedEntries}`,
  };
};

const handleList = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe list [directory] [environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const environment = argv[2] ?? "preview";

  if (environment !== "preview" && environment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `environment "${environment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const response = await deps.listClient.getList({ environment, manifest });

  const renderedEntries = response.deployments
    .map((d) => `  ${d.deploymentId} — ${d.state} (deployed: ${d.deployedAt})`)
    .join("\n");

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Deployments for project "${response.name}" in ${response.environment}:\n${renderedEntries}`,
  };
};

const handleStatus = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe status [directory] [environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const environment = argv[2] ?? "preview";

  if (environment !== "preview" && environment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `environment "${environment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const response = await deps.statusClient.getStatus({ environment, manifest });

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Status of project "${response.name}" in ${response.environment}: ${response.state} (last updated: ${response.updatedAt})`,
  };
};

const handleTeardown = async (argv: string[], deps: CliDependencies): Promise<HandlerResult> => {
  if (argv.length > 3) {
    return {
      exitCode: 1,
      output: "Too many arguments. Usage: universe teardown [directory] [target-environment]",
    };
  }

  const platformYamlDir = argv[1] ?? deps.cwd;
  const targetEnvironment = argv[2] ?? "preview";

  if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
    throw new CreateUnsupportedCombinationError(
      `target-environment "${targetEnvironment}" — valid values are: preview, production`,
    );
  }

  const platformYamlPath = join(platformYamlDir, "platform.yaml");
  const manifest = await readAndValidateManifest(platformYamlPath, deps);
  const receipt = await deps.teardownClient.teardown({ manifest, targetEnvironment });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Tore down project "${receipt.name}" in ${receipt.targetEnvironment}. Teardown ID: ${receipt.teardownId}`,
  };
};

export {
  handleCreate,
  handleDeploy,
  handleList,
  handleLogs,
  handlePromote,
  handleRegister,
  handleRollback,
  handleStatus,
  handleTeardown,
};
export type { CliDependencies, CliResult, HandlerResult };
