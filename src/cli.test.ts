import type { CreateInputValidator } from "./ports/create-input-validator.js";
import type { ObservabilityClient } from "./ports/observability-client.js";
import type { CreateSelections, PromptPort } from "./ports/prompt-port.js";
import { runCli } from "./cli.js";
import { InvalidNameError } from "./errors/cli-errors.js";

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

const createPromptResult: CreateSelections = {
  confirmed: true,
  databases: ["PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Auth", "Email"],
  runtime: "Node.js (TypeScript)",
};

const createPrompt: PromptPort = {
  promptForCreateInputs() {
    return Promise.resolve(createPromptResult);
  },
};

const cancelledCreatePrompt: PromptPort = {
  promptForCreateInputs() {
    return Promise.resolve(null);
  },
};

const passThroughValidator: CreateInputValidator = {
  validateCreateInput(input) {
    return input;
  },
};

const invalidNameValidator: CreateInputValidator = {
  validateCreateInput() {
    throw new InvalidNameError("InvalidName");
  },
};

const createDeps = (promptPort: PromptPort, validator: CreateInputValidator) => ({
  observability: client,
  promptPort,
  validator,
});

describe(runCli, () => {
  describe("--help", () => {
    it("exits with code 0", async () => {
      const result = await runCli(["--help"], createDeps(createPrompt, passThroughValidator));

      expect(result.exitCode).toBe(0);
    });

    it("output lists all 9 commands", async () => {
      const { output } = await runCli(["--help"], createDeps(createPrompt, passThroughValidator));

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
    it.each(DEFERRED_COMMANDS)('"%s" exits non-zero', async (cmd) => {
      const result = await runCli([cmd], createDeps(createPrompt, passThroughValidator));

      expect(result.exitCode).not.toBe(0);
    });

    it.each(DEFERRED_COMMANDS)('"%s" output contains the command name', async (cmd) => {
      const { output } = await runCli([cmd], createDeps(createPrompt, passThroughValidator));

      expect(output).toContain(cmd);
    });

    it("emits the standardized not-implemented message", async () => {
      const { output } = await runCli(["register"], createDeps(createPrompt, passThroughValidator));

      expect(output).toMatchInlineSnapshot(
        `"The 'register' command is not yet implemented in this spike. It will be available in a future release."`,
      );
    });
  });

  describe("create", () => {
    it("returns a confirmation summary when inputs are confirmed", async () => {
      const { output } = await runCli(["create"], createDeps(createPrompt, passThroughValidator));

      expect(output).toMatchInlineSnapshot(`
        "Create configuration confirmed:
        - Name: hello-universe
        - Runtime: Node.js (TypeScript)
        - Framework: Express
        - Databases: PostgreSQL
        - Platform services: Auth, Email"
      `);
    });

    it("returns non-zero when prompt flow is cancelled", async () => {
      const result = await runCli(
        ["create"],
        createDeps(cancelledCreatePrompt, passThroughValidator),
      );

      expect(result.exitCode).toBe(1);
    });

    it("is interactive-only and rejects extra args", async () => {
      const { output } = await runCli(
        ["create", "my-app"],
        createDeps(createPrompt, passThroughValidator),
      );

      expect(output).toBe(
        'The "create" command is interactive-only in this spike. Run "universe create" with no additional arguments.',
      );
    });

    it("returns actionable feedback for invalid input", async () => {
      const result = await runCli(["create"], createDeps(createPrompt, invalidNameValidator));

      expect(result.output).toContain("Invalid project name");
    });
  });
});
