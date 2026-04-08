import type { CreateSelections, PromptPort } from "../ports/prompt-port.js";
import { ClackPromptAdapter } from "./clack-prompt-adapter.js";
import type { ClackPromptApi } from "./clack-prompt-adapter.js";

const CANCELLED = Symbol("cancelled");

const createMockApi = (
  selectResponses: string[] = ["Node.js (TypeScript)", "Express"],
  multiselectResponses: string[][] = [["PostgreSQL"], ["Auth"]],
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

describe(ClackPromptAdapter, () => {
  it("prompts in the required order", async () => {
    const events: string[] = [];
    const selectQueue = ["Node.js (TypeScript)", "None"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["Node.js (TypeScript)", "None"], [["None"], ["None"]]),
      confirm() {
        events.push("confirmation");
        return Promise.resolve(true);
      },
      multiselect(options) {
        events.push(options.message);
        return Promise.resolve(["None"]);
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

    const adapter = new ClackPromptAdapter(mockApi);

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
    const selectQueue = ["Static (HTML/CSS/JS)", "None"];
    const mockApi: ClackPromptApi = {
      ...createMockApi(["Static (HTML/CSS/JS)", "None"], [["None"], ["None"]]),
      select(options) {
        frameworkOptions.push(options.options);
        const nextSelection = selectQueue.shift() as string;
        return Promise.resolve(nextSelection);
      },
    };

    const adapter = new ClackPromptAdapter(mockApi);

    await adapter.promptForCreateInputs();

    expect(frameworkOptions[1]).toStrictEqual([{ label: "None", value: "None" }]);
  });

  it("returns null when cancelled", async () => {
    const mockApi: ClackPromptApi = {
      ...createMockApi(),
      text() {
        return Promise.resolve(CANCELLED);
      },
    };

    const adapter = new ClackPromptAdapter(mockApi);

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

    const adapter = new ClackPromptAdapter(mockApi);

    await adapter.promptForCreateInputs();

    expect(validationMessage).toBe(
      "Name must be lowercase kebab-case, start with a letter, and be 3–50 characters long.",
    );
  });

  it("returns selected values and confirmation state", async () => {
    const expected: CreateSelections = {
      confirmed: true,
      databases: ["PostgreSQL", "Redis"],
      framework: "Express",
      name: "hello-universe",
      platformServices: ["Auth", "Analytics"],
      runtime: "Node.js (TypeScript)",
    };

    const mockApi = createMockApi(
      ["Node.js (TypeScript)", "Express"],
      [
        ["PostgreSQL", "Redis"],
        ["Auth", "Analytics"],
      ],
    );

    const adapter: PromptPort = new ClackPromptAdapter(mockApi);

    const result = await adapter.promptForCreateInputs();

    expect(result).toStrictEqual(expected);
  });
});
