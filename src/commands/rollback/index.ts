import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { RollbackClient } from "../../platform/rollback-client.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleRollback = async (
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
