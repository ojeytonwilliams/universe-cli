import type { CreateSelections, Prompt } from "./prompt.port.js";
import { ClackPrompt } from "./clack-prompt.js";
import type { ClackPromptApi } from "./clack-prompt.js";

const CANCELLED = Symbol("cancelled");

const createMockApi = (
  selectResponses: string[] = ["node", "express", "pnpm"],
  multiselectResponses: string[][] = [["postgresql"], ["auth"]],
): ClackPromptApi => {
  const selectQueue = [...selectResponses];
  const multiselectQueue = [...multiselectResponses];

  return {
    confirm() {
      return Promise.resolve(true);
    },
    isCancel(value: unknown): value is symbol {
      return value === CANCELLED;
    },
    multiselect() {
      return Promise.resolve(multiselectQueue.shift() ?? ["None"]);
    },
    select() {
      return Promise.resolve(selectQueue.shift() ?? "None");
    },
    text() {
      return Promise.resolve("hello-universe");
    },
  };
};

describe(ClackPrompt, () => {
  it("prompts in the required order for Node runtime", async () => {
    const events: string[] = [];
    const selectQueue = ["node", "none", "pnpm"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["node", "none", "pnpm"], [["none"], ["none"]]),
      confirm() {
        events.push("confirmation");
        return Promise.resolve(true);
      },
      multiselect(options) {
        events.push(options.message);
        return Promise.resolve(["none"]);
      },
      select(options) {
        events.push(options.message);
        const nextSelection = selectQueue.shift() as string;
        return Promise.resolve(nextSelection);
      },
      text(options) {
        events.push(options.message);
        return Promise.resolve("hello-universe");
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(events).toStrictEqual([
      "Enter project name",
      "Select runtime",
      "Select framework",
      "Select package manager",
      "Select databases",
      "Select platform services",
      "confirmation",
    ]);
  });

  it("does not prompt for package manager when runtime is static_web", async () => {
    const events: string[] = [];
    const selectQueue = ["static_web", "none"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["static_web", "none"], [["none"], ["none"]]),
      confirm() {
        events.push("confirmation");
        return Promise.resolve(true);
      },
      multiselect(options) {
        events.push(options.message);
        return Promise.resolve(["none"]);
      },
      select(options) {
        events.push(options.message);
        const nextSelection = selectQueue.shift() as string;
        return Promise.resolve(nextSelection);
      },
      text(options) {
        events.push(options.message);
        return Promise.resolve("hello-universe");
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(events).toStrictEqual([
      "Enter project name",
      "Select runtime",
      "Select framework",
      "Select databases",
      "Select platform services",
      "confirmation",
    ]);
  });

  it("filters framework options for Static runtime", async () => {
    const frameworkOptions: { label: string; value: string }[][] = [];
    const selectQueue = ["static_web", "none"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["static_web", "none"], [["none"], ["none"]]),
      select(options) {
        frameworkOptions.push(options.options);
        const nextSelection = selectQueue.shift() as string;
        return Promise.resolve(nextSelection);
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(frameworkOptions[1]).toStrictEqual([
      { label: "React (Vite)", value: "react-vite" },
      { label: "None", value: "none" },
    ]);
  });

  it("includes TypeScript in framework options for Node runtime", async () => {
    const frameworkOptions: { label: string; value: string }[][] = [];
    const selectQueue = ["node", "typescript", "pnpm"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["node", "typescript", "pnpm"], [["none"], ["none"]]),
      select(options) {
        frameworkOptions.push(options.options);
        const nextSelection = selectQueue.shift() as string;
        return Promise.resolve(nextSelection);
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(frameworkOptions[1]).toContainEqual({ label: "TypeScript", value: "typescript" });
  });

  it("returns null when cancelled", async () => {
    const mockApi: ClackPromptApi = {
      ...createMockApi(),
      text() {
        return Promise.resolve(CANCELLED);
      },
    };

    const adapter = new ClackPrompt(mockApi);

    const result = await adapter.promptForCreateInputs();

    expect(result).toBeNull();
  });

  it("provides actionable validation feedback for invalid names", async () => {
    let validationMessage = "";
    const mockApi: ClackPromptApi = {
      ...createMockApi(),
      text(options) {
        const validate = options.validate as (
          value: string | undefined,
        ) => string | Error | undefined;
        validationMessage = validate("InvalidName") as string;
        return Promise.resolve("hello-universe");
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(validationMessage).toBe(
      "Name must be lowercase kebab-case, start with a letter, and be 3–50 characters long.",
    );
  });

  it("returns selected values including package manager for Node runtime", async () => {
    const expected: CreateSelections = {
      confirmed: true,
      databases: ["postgresql", "redis"],
      framework: "express",
      name: "hello-universe",
      packageManager: "pnpm",
      platformServices: ["auth", "analytics"],
      runtime: "node",
    };

    const mockApi = createMockApi(
      ["node", "express", "pnpm"],
      [
        ["postgresql", "redis"],
        ["auth", "analytics"],
      ],
    );

    const adapter: Prompt = new ClackPrompt(mockApi);

    const result = await adapter.promptForCreateInputs();

    expect(result).toStrictEqual(expected);
  });

  it("returns selected values without package manager for Static runtime", async () => {
    const expected: CreateSelections = {
      confirmed: true,
      databases: ["none"],
      framework: "none",
      name: "hello-universe",
      platformServices: ["none"],
      runtime: "static_web",
    };

    const mockApi = createMockApi(["static_web", "none"], [["none"], ["none"]]);

    const adapter: Prompt = new ClackPrompt(mockApi);

    const result = await adapter.promptForCreateInputs();

    expect(result).toStrictEqual(expected);
  });

  it("includes package manager in confirmation message for Node runtime", async () => {
    let confirmMessage = "";
    const mockApi: ClackPromptApi = {
      ...createMockApi(["node", "express", "pnpm"], [["none"], ["none"]]),
      confirm(options) {
        confirmMessage = options.message;
        return Promise.resolve(true);
      },
    };

    const adapter = new ClackPrompt(mockApi);

    await adapter.promptForCreateInputs();

    expect(confirmMessage).toContain("Package manager");
    expect(confirmMessage).toContain("pnpm");
  });
});
