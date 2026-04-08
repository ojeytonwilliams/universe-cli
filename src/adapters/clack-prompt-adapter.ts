import { confirm, isCancel, multiselect, select, text } from "@clack/prompts";
import type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PlatformServiceOption,
  PromptPort,
  RuntimeOption,
} from "../ports/prompt-port.js";

interface ClackPromptApi {
  confirm(options: { message: string }): Promise<boolean | symbol>;
  isCancel(value: unknown): value is symbol;
  multiselect(options: {
    message: string;
    options: { label: string; value: string }[];
  }): Promise<string[] | symbol>;
  select(options: {
    message: string;
    options: { label: string; value: string }[];
  }): Promise<string | symbol>;
  text(options: {
    message: string;
    placeholder?: string;
    validate?: (value: string | undefined) => string | Error | undefined;
  }): Promise<string | symbol>;
}

const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9-]{2,49}$/;

const defaultClackApi: ClackPromptApi = {
  confirm,
  isCancel,
  multiselect,
  select,
  text,
};

const FRAMEWORKS_BY_RUNTIME: Record<RuntimeOption, FrameworkOption[]> = {
  "Node.js (TypeScript)": ["Express", "None"],
  "Static (HTML/CSS/JS)": ["None"],
};

const DATABASES_BY_RUNTIME: Record<RuntimeOption, DatabaseOption[]> = {
  "Node.js (TypeScript)": ["PostgreSQL", "Redis", "None"],
  "Static (HTML/CSS/JS)": ["None"],
};

const SERVICES_BY_RUNTIME: Record<RuntimeOption, PlatformServiceOption[]> = {
  "Node.js (TypeScript)": ["Auth", "Email", "Analytics", "None"],
  "Static (HTML/CSS/JS)": ["None"],
};

class ClackPromptAdapter implements PromptPort {
  private readonly api: ClackPromptApi;

  constructor(api: ClackPromptApi = defaultClackApi) {
    this.api = api;
  }

  async promptForCreateInputs(): Promise<CreateSelections | null> {
    const name = await this.api.text({
      message: "Enter project name",
      placeholder: "my-project",
      validate: (value) => {
        if (value !== undefined && PROJECT_NAME_PATTERN.test(value)) {
          return undefined;
        }

        return "Name must be lowercase kebab-case, start with a letter, and be 3–50 characters long.";
      },
    });

    if (this.api.isCancel(name)) {
      return null;
    }

    const runtime = await this.api.select({
      message: "Select runtime",
      options: [
        { label: "Node.js (TypeScript)", value: "Node.js (TypeScript)" },
        { label: "Static (HTML/CSS/JS)", value: "Static (HTML/CSS/JS)" },
      ],
    });

    if (this.api.isCancel(runtime)) {
      return null;
    }

    const framework = await this.api.select({
      message: "Select framework",
      options: FRAMEWORKS_BY_RUNTIME[runtime as RuntimeOption].map((value) => ({
        label: value,
        value,
      })),
    });

    if (this.api.isCancel(framework)) {
      return null;
    }

    const databases = await this.api.multiselect({
      message: "Select databases",
      options: DATABASES_BY_RUNTIME[runtime as RuntimeOption].map((value) => ({
        label: value,
        value,
      })),
    });

    if (this.api.isCancel(databases)) {
      return null;
    }

    const platformServices = await this.api.multiselect({
      message: "Select platform services",
      options: SERVICES_BY_RUNTIME[runtime as RuntimeOption].map((value) => ({
        label: value,
        value,
      })),
    });

    if (this.api.isCancel(platformServices)) {
      return null;
    }

    const isConfirmed = await this.api.confirm({
      message:
        "Confirm create configuration:\n" +
        `- Name: ${name}\n` +
        `- Runtime: ${runtime}\n` +
        `- Framework: ${framework}\n` +
        `- Databases: ${databases.join(", ")}\n` +
        `- Platform services: ${platformServices.join(", ")}`,
    });

    if (this.api.isCancel(isConfirmed)) {
      return null;
    }

    return {
      confirmed: isConfirmed,
      databases: databases as DatabaseOption[],
      framework: framework as FrameworkOption,
      name,
      platformServices: platformServices as PlatformServiceOption[],
      runtime: runtime as RuntimeOption,
    };
  }
}

export { ClackPromptAdapter };
export type { ClackPromptApi };
