import { join } from "node:path";
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
import type { LayerComposer } from "./services/layer-composition-service.js";
import type {
  PlatformManifest,
  PlatformManifestGenerator,
} from "./services/platform-manifest-service.js";
import type { CreateInputValidator } from "./services/create-input-validation-service.js";
import type { PackageManagerRunner } from "./commands/create/package-manager/package-manager.service.js";

interface CliResult {
  exitCode: number;
  output: string;
}

type HandlerResult = CliResult & { meta?: Record<string, string> };

const readAndValidateManifest = async (
  projectDirectory: string,
  deps: { platformManifestGenerator: PlatformManifestGenerator; projectReader: ProjectReaderPort },
): Promise<PlatformManifest> => {
  const platformYamlPath = join(projectDirectory, "platform.yaml");
  const yaml = await deps.projectReader.readFile(platformYamlPath);

  return deps.platformManifestGenerator.validateManifest(yaml, platformYamlPath);
};

const handleCreate = async (
  { cwd }: { cwd: string },
  deps: {
    filesystemWriter: FilesystemWriter;
    layerResolver: LayerComposer;
    packageManager: PackageManagerRunner;
    platformManifestGenerator: PlatformManifestGenerator;
    prompt: Prompt;
    repoInitialiser: RepoInitialiser;
    validator: CreateInputValidator;
  },
): Promise<HandlerResult> => {
  const promptResult = await deps.prompt.promptForCreateInputs();

  if (promptResult === null || !promptResult.confirmed) {
    return { exitCode: 1, output: "Create cancelled before writing files." };
  }

  const validatedInput = deps.validator.validateCreateInput(promptResult);
  const resolvedLayers = deps.layerResolver.resolveLayers(validatedInput);
  const targetDirectory = join(cwd, validatedInput.name);
  const projectFiles = {
    ...resolvedLayers.files,
    "platform.yaml": deps.platformManifestGenerator.generatePlatformManifest(validatedInput),
  };

  await deps.filesystemWriter.writeProject(targetDirectory, projectFiles);

  if (validatedInput.runtime === "node") {
    await deps.packageManager.run({
      manager: validatedInput.packageManager!,
      projectDirectory: targetDirectory,
    });
  }

  await deps.repoInitialiser.initialise(targetDirectory);

  return { exitCode: 0, output: `Scaffolded project at ${targetDirectory}` };
};

const handleRegister = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
    registrationClient: RegistrationClient;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const receipt = await deps.registrationClient.register(manifest);

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Registered project "${receipt.name}". Registration ID: ${receipt.registrationId}`,
  };
};

const handleDeploy = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    deployClient: DeployClient;
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const receipt = await deps.deployClient.deploy({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Deployed project "${receipt.name}" to preview. Deployment ID: ${receipt.deploymentId}`,
  };
};

const handlePromote = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
    promoteClient: PromoteClient;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const receipt = await deps.promoteClient.promote({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Promoted project "${receipt.name}" to production. Promotion ID: ${receipt.promotionId}`,
  };
};

const handleRollback = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
    rollbackClient: RollbackClient;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const receipt = await deps.rollbackClient.rollback({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Rolled back project "${receipt.name}" to production. Rollback ID: ${receipt.rollbackId}`,
  };
};

const handleLogs = async (
  { environment, projectDirectory }: { environment: string; projectDirectory: string },
  deps: {
    logsClient: LogsClient;
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
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

const handleList = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    listClient: ListClient;
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const response = await deps.listClient.getList({ manifest });

  const renderedEntries = response.deployments
    .map((d) => `  ${d.deploymentId} — ${d.state} (deployed: ${d.deployedAt})`)
    .join("\n");

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Deployments for project "${response.name}" in preview:\n${renderedEntries}`,
  };
};

const handleStatus = async (
  { environment, projectDirectory }: { environment: string; projectDirectory: string },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
    statusClient: StatusClient;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const response = await deps.statusClient.getStatus({ environment, manifest });

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Status of project "${response.name}" in ${response.environment}: ${response.state} (last updated: ${response.updatedAt})`,
  };
};

const handleTeardown = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
    teardownClient: TeardownClient;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const receipt = await deps.teardownClient.teardown({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Tore down project "${receipt.name}". Teardown ID: ${receipt.teardownId}`,
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
export type { CliResult, HandlerResult };
