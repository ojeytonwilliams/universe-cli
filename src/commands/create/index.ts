import type { FilesystemWriter } from "../../io/filesystem-writer.port.js";
import type { LayerComposer } from "./layer-composition/layer-composition-service.js";
import type { PackageManagerRunner } from "./package-manager/package-manager.service.js";
import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { Prompt } from "./prompt/prompt.port.js";
import type { RepoInitialiser } from "../../io/repo-initialiser.port.js";
import type { CreateInputValidator } from "./create-input-validation-service.js";

export interface HandlerResult {
  exitCode: number;
  output: string;
  meta?: Record<string, string>;
}

export const handleCreate = async (
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
  const targetDirectory = `${cwd}/${validatedInput.name}`;
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
