import type { LogsClient } from "../../platform/logs-client.port.js";
import type { PlatformManifestGenerator } from "../../services/platform-manifest-service.js";
import type { ProjectReaderPort } from "../../io/project-reader.port.js";
import type { HandlerResult } from "../create/index.js";
import { readAndValidateManifest } from "../../services/platform-manifest-service.js";

export const handleLogs = async (
  { environment, projectDirectory }: { environment: string; projectDirectory: string },
  deps: {
    logsClient: LogsClient;
    platformManifestGenerator: PlatformManifestGenerator;
    projectReader: ProjectReaderPort;
  },
): Promise<HandlerResult> => {
  const manifest = await readAndValidateManifest(projectDirectory, deps);
  const response = await deps.logsClient.getLogs({ environment, manifest });

  const renderedEntries = response.entries
    .map((e) => `${e.timestamp} [${e.level}] ${e.message}`)
    .join("\n");

  return {
    exitCode: 0,
    meta: { name: response.name },
    output: `Logs for project "${response.name}" in ${response.environment}:\n${renderedEntries}`,
  };
};
