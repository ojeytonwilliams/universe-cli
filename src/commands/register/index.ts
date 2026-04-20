import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { RegistrationClient } from "../../platform/registration-client.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleRegister = async (
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
