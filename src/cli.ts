// oxlint-disable-next-line import/no-nodejs-modules
import { join } from "path";
import { CliError, DeferredCommandError } from "./errors/cli-errors.js";
import type { CreateInputValidator } from "./ports/create-input-validator.js";
import type { FilesystemWriter } from "./ports/filesystem-writer.js";
import type { LayerResolver } from "./ports/layer-resolver.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { PlatformManifestGenerator } from "./ports/platform-manifest-generator.js";
import type { PromptPort } from "./ports/prompt-port.js";
import { safeError } from "./ports/observability-client.js";

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
  filesystemWriter: FilesystemWriter;
  layerResolver: LayerResolver;
  observability: ObservabilityClient;
  platformManifestGenerator: PlatformManifestGenerator;
  promptPort: PromptPort;
  validator: CreateInputValidator;
}

const DEFERRED_COMMANDS = new Set([
  "deploy",
  "list",
  "logs",
  "promote",
  "register",
  "rollback",
  "status",
  "teardown",
]);

const renderProjectFiles = (
  files: Record<string, string>,
  selection: {
    framework: string;
    name: string;
    runtime: string;
  },
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(files).map(([filePath, content]) => [
      filePath,
      content
        .replaceAll("__FRAMEWORK__", selection.framework)
        .replaceAll("__PROJECT_NAME__", selection.name)
        .replaceAll("__RUNTIME__", selection.runtime),
    ]),
  );

const runCli = async (argv: string[], deps: CliDependencies): Promise<CliResult> => {
  const {
    cwd,
    filesystemWriter,
    layerResolver,
    observability,
    platformManifestGenerator,
    promptPort,
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
      const renderedFiles = renderProjectFiles(
        {
          ...resolvedLayers.files,
          "platform.yaml": platformManifestGenerator.generatePlatformManifest(validatedInput),
        },
        validatedInput,
      );

      await filesystemWriter.writeProject(targetDirectory, renderedFiles);

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

  return { exitCode: 1, output: `Unknown command: "${command}". Run "universe --help" for usage.` };
};

export { runCli };
export type { CliResult };
