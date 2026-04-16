import { join } from "node:path";
import type { DeployClient } from "./ports/deploy-client.js";
import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { ListClient } from "./ports/list-client.js";
import type { PackageManager } from "./ports/package-manager.js";
import type { RepoInitialiser } from "./ports/repo-initialiser.js";
import type { PromoteClient } from "./ports/promote-client.js";
import type { Prompt } from "./ports/prompt.js";
import type { ProjectReaderPort } from "./ports/project-reader.js";
import type { RegistrationClient } from "./ports/registration-client.js";
import type { RollbackClient } from "./ports/rollback-client.js";
import type { StatusClient } from "./ports/status-client.js";
import type { TeardownClient } from "./ports/teardown-client.js";
import type { LogsClient } from "./ports/logs-client.js";
import type { LayerComposer } from "./services/layer-composition-service.js";
import type {
  PlatformManifest,
  PlatformManifestGenerator,
} from "./services/platform-manifest-service.js";
import type { CreateInputValidator } from "./services/create-input-validation-service.js";

interface CliResult {
  exitCode: number;
  output: string;
}

interface Services {
  layerResolver: LayerComposer;
  platformManifestGenerator: PlatformManifestGenerator;
  validator: CreateInputValidator;
}

interface Adapters {
  deployClient: DeployClient;
  filesystemWriter: FilesystemWriter;
  listClient: ListClient;
  logsClient: LogsClient;
  packageManager: PackageManager;
  projectReader: ProjectReaderPort;
  repoInitialiser: RepoInitialiser;
  promoteClient: PromoteClient;
  prompt: Prompt;
  registrationClient: RegistrationClient;
  rollbackClient: RollbackClient;
  statusClient: StatusClient;
  teardownClient: TeardownClient;
}

type HandlerResult = CliResult & { meta?: Record<string, string> };

const readAndValidateManifest = async (
  projectDirectory: string,
  services: Pick<Services, "platformManifestGenerator">,
  adapters: Pick<Adapters, "projectReader">,
): Promise<PlatformManifest> => {
  const platformYamlPath = join(projectDirectory, "platform.yaml");
  const yaml = await adapters.projectReader.readFile(platformYamlPath);

  return services.platformManifestGenerator.validateManifest(yaml, platformYamlPath);
};

const handleCreate = async (
  cwd: string,
  deps: {
    services: Pick<Services, "layerResolver" | "platformManifestGenerator" | "validator">;
    adapters: Pick<Adapters, "filesystemWriter" | "packageManager" | "prompt" | "repoInitialiser">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;

  const promptResult = await adapters.prompt.promptForCreateInputs();

  if (promptResult === null || !promptResult.confirmed) {
    return { exitCode: 1, output: "Create cancelled before writing files." };
  }

  const validatedInput = services.validator.validateCreateInput(promptResult);
  const resolvedLayers = services.layerResolver.resolveLayers(validatedInput);
  const targetDirectory = join(cwd, validatedInput.name);
  const projectFiles = {
    ...resolvedLayers.files,
    "platform.yaml": services.platformManifestGenerator.generatePlatformManifest(validatedInput),
  };

  await adapters.filesystemWriter.writeProject(targetDirectory, projectFiles);

  if (validatedInput.runtime === "node") {
    // Support both legacy adapter and new service
    // oxlint-disable-next-line no-unsafe-member-access
    if (typeof (adapters.packageManager as any).run === "function") {
      // oxlint-disable-next-line no-unsafe-member-access, no-unsafe-call
      await (adapters.packageManager as any).run({
        manager: validatedInput.packageManager,
        projectDirectory: targetDirectory,
      });
    } else {
      await adapters.packageManager.specifyDeps(targetDirectory);
      await adapters.packageManager.install(targetDirectory);
    }
  }

  await adapters.repoInitialiser.initialise(targetDirectory);

  return { exitCode: 0, output: `Scaffolded project at ${targetDirectory}` };
};

const handleRegister = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "projectReader" | "registrationClient">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const receipt = await adapters.registrationClient.register(manifest);

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Registered project "${receipt.name}". Registration ID: ${receipt.registrationId}`,
  };
};

const handleDeploy = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "deployClient" | "projectReader">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const receipt = await adapters.deployClient.deploy({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Deployed project "${receipt.name}" to preview. Deployment ID: ${receipt.deploymentId}`,
  };
};

const handlePromote = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "projectReader" | "promoteClient">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const receipt = await adapters.promoteClient.promote({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Promoted project "${receipt.name}" to production. Promotion ID: ${receipt.promotionId}`,
  };
};

const handleRollback = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "projectReader" | "rollbackClient">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const receipt = await adapters.rollbackClient.rollback({ manifest });

  return {
    exitCode: 0,
    meta: { name: receipt.name },
    output: `Rolled back project "${receipt.name}" to production. Rollback ID: ${receipt.rollbackId}`,
  };
};

const handleLogs = async (
  { environment, projectDirectory }: { environment: string; projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "logsClient" | "projectReader">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const response = await adapters.logsClient.getLogs({ environment, manifest });

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
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "listClient" | "projectReader">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const response = await adapters.listClient.getList({ manifest });

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
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "projectReader" | "statusClient">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const response = await adapters.statusClient.getStatus({ environment, manifest });

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Status of project "${response.name}" in ${response.environment}: ${response.state} (last updated: ${response.updatedAt})`,
  };
};

const handleTeardown = async (
  { projectDirectory }: { projectDirectory: string },
  deps: {
    services: Pick<Services, "platformManifestGenerator">;
    adapters: Pick<Adapters, "projectReader" | "teardownClient">;
  },
): Promise<HandlerResult> => {
  const { services, adapters } = deps;
  const manifest = await readAndValidateManifest(projectDirectory, services, adapters);
  const receipt = await adapters.teardownClient.teardown({ manifest });

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
export type { Adapters, CliResult, HandlerResult, Services };
