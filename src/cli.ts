import { CliError } from "./errors/cli-errors.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import type { HandlerResult } from "./commands/create/index.js";

const runCli = async (
  command: string,
  handler: () => Promise<HandlerResult>,
  observability: ObservabilityClient,
): Promise<{ exitCode: number; output: string }> => {
  observability.safeTrack(`${command}.start`);
  try {
    const result = await handler();
    if (result.exitCode === 0) {
      observability.safeTrack(`${command}.success`, result.meta);
    }
    return { exitCode: result.exitCode, output: result.output };
  } catch (error) {
    if (error instanceof CliError) {
      observability.safeError(error);
      observability.safeTrack(`${command}.failure`);
      return { exitCode: error.exitCode, output: error.stack ?? error.message };
    }
    throw error;
  }
};

export { runCli };

export interface CliResult {
  exitCode: number;
  output: string;
}
// Export type { CliResult };
