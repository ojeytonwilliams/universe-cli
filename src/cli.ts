import { CliError } from "./errors/cli-errors.js";
import type { ObservabilityClient } from "./observability/observability-client.port.js";
import type { CliResult, HandlerResult } from "./commands.js";

const runCli = async (
  command: string,
  handler: () => Promise<HandlerResult>,
  observability: ObservabilityClient,
): Promise<CliResult> => {
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
      return { exitCode: error.exitCode, output: error.message };
    }
    throw error;
  }
};

export { runCli };
export type { CliResult };
