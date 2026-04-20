import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { PromoteClient } from "../../platform/promote-client.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handlePromote = async (
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
