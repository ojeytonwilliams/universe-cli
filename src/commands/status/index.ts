import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { StatusClient } from "../../platform/status-client.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleStatus = async (
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
