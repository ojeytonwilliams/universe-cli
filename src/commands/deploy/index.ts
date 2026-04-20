import type { DeployClient } from "../../platform/deploy-client.port.js";
import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleDeploy = async (
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
