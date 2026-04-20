import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { TeardownClient } from "../../platform/teardown-client.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleTeardown = async (
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
