import type { ListClient } from "../../platform/list-client.port.js";
import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleList = async (
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
    .map((d) => `  ${d.deploymentId}  ${d.state} (deployed: ${d.deployedAt})`)
    .join("\n");

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Deployments for project "${response.name}" in preview:\n${renderedEntries}`,
  };
};
