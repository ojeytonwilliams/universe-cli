import type { ObservabilityClient } from "./ports/observability-client.js";
import { runCli } from "./cli.js";

const client: ObservabilityClient = {
  error() {},
  track() {},
};

const DEFERRED_COMMANDS = [
  "deploy",
  "list",
  "logs",
  "promote",
  "register",
  "rollback",
  "status",
  "teardown",
] as const;

describe(runCli, () => {
  describe("--help", () => {
    it("exits with code 0", () => {
      const result = runCli(["--help"], client);

      expect(result.exitCode).toBe(0);
    });

    it("output lists all 9 commands", () => {
      const { output } = runCli(["--help"], client);

      expect(output).toMatchInlineSnapshot(`
        "Usage: universe <command>

        Commands:
          create      Scaffold a new project locally
          deploy      Deploy a project to the platform
          list        List all registered projects
          logs        View logs for a project
          promote     Promote a deployment to the next environment
          register    Register a project with the platform
          rollback    Roll back to the previous deployment
          status      Show the status of a project
          teardown    Remove a project from the platform

        Options:
          --help      Show this help message"
      `);
    });
  });

  describe("deferred commands", () => {
    it.each(DEFERRED_COMMANDS)('"%s" exits non-zero', (cmd) => {
      const result = runCli([cmd], client);

      expect(result.exitCode).not.toBe(0);
    });

    it.each(DEFERRED_COMMANDS)('"%s" output contains the command name', (cmd) => {
      const { output } = runCli([cmd], client);

      expect(output).toContain(cmd);
    });

    it("emits the standardized not-implemented message", () => {
      const { output } = runCli(["register"], client);

      expect(output).toMatchInlineSnapshot(
        `"The 'register' command is not yet implemented in this spike. It will be available in a future release."`,
      );
    });
  });
});
