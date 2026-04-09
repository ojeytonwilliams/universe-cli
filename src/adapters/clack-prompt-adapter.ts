import { confirm, isCancel, multiselect, select, text } from "@clack/prompts";
import {
  DATABASE_LABELS,
  DATABASE_OPTIONS,
  FRAMEWORK_LABELS,
  FRAMEWORK_OPTIONS,
  PLATFORM_SERVICE_LABELS,
  PLATFORM_SERVICE_OPTIONS,
  RUNTIME_LABELS,
  RUNTIME_OPTIONS,
} from "../ports/prompt-port.js";
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

const RUNTIME_PROMPT_OPTIONS: { label: string; value: RuntimeOption }[] = [
  {
    label: RUNTIME_LABELS[RUNTIME_OPTIONS.NODE_TS],
    value: RUNTIME_OPTIONS.NODE_TS,
  },
  {
    label: RUNTIME_LABELS[RUNTIME_OPTIONS.STATIC_WEB],
    value: RUNTIME_OPTIONS.STATIC_WEB,
  },
];

const NODE_FRAMEWORK_OPTIONS: FrameworkOption[] = [
  FRAMEWORK_OPTIONS.EXPRESS,
  FRAMEWORK_OPTIONS.NONE,
];
const STATIC_FRAMEWORK_OPTIONS: FrameworkOption[] = [FRAMEWORK_OPTIONS.NONE];

const NODE_DATABASE_OPTIONS: DatabaseOption[] = [
  DATABASE_OPTIONS.POSTGRESQL,
  DATABASE_OPTIONS.REDIS,
  DATABASE_OPTIONS.NONE,
];
const STATIC_DATABASE_OPTIONS: DatabaseOption[] = [DATABASE_OPTIONS.NONE];

const NODE_SERVICE_OPTIONS: PlatformServiceOption[] = [
  PLATFORM_SERVICE_OPTIONS.AUTH,
  PLATFORM_SERVICE_OPTIONS.EMAIL,
  PLATFORM_SERVICE_OPTIONS.ANALYTICS,
  PLATFORM_SERVICE_OPTIONS.NONE,
];
const STATIC_SERVICE_OPTIONS: PlatformServiceOption[] = [PLATFORM_SERVICE_OPTIONS.NONE];

const toPromptOptions = <T extends string>(
  values: T[],
  labels: Record<T, string>,
): { label: string; value: T }[] =>
  values.map((value) => ({
    label: labels[value],
    value,
  }));

const toLabelList = <T extends string>(values: T[], labels: Record<T, string>): string =>
  values.map((value) => labels[value]).join(", ");

const getFrameworkOptions = (runtime: RuntimeOption): FrameworkOption[] => {
  if (runtime === RUNTIME_OPTIONS.NODE_TS) {
    return NODE_FRAMEWORK_OPTIONS;
  }

  return STATIC_FRAMEWORK_OPTIONS;
};

const getDatabaseOptions = (runtime: RuntimeOption): DatabaseOption[] => {
  if (runtime === RUNTIME_OPTIONS.NODE_TS) {
    return NODE_DATABASE_OPTIONS;
  }

  return STATIC_DATABASE_OPTIONS;
};

const getServiceOptions = (runtime: RuntimeOption): PlatformServiceOption[] => {
  if (runtime === RUNTIME_OPTIONS.NODE_TS) {
    return NODE_SERVICE_OPTIONS;
  }

  return STATIC_SERVICE_OPTIONS;
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
      options: RUNTIME_PROMPT_OPTIONS,
    });

    if (this.api.isCancel(runtime)) {
      return null;
    }

    const framework = await this.api.select({
      message: "Select framework",
      options: toPromptOptions(getFrameworkOptions(runtime as RuntimeOption), FRAMEWORK_LABELS),
    });

    if (this.api.isCancel(framework)) {
      return null;
    }

    const databases = await this.api.multiselect({
      message: "Select databases",
      options: toPromptOptions(getDatabaseOptions(runtime as RuntimeOption), DATABASE_LABELS),
    });

    if (this.api.isCancel(databases)) {
      return null;
    }

    const platformServices = await this.api.multiselect({
      message: "Select platform services",
      options: toPromptOptions(
        getServiceOptions(runtime as RuntimeOption),
        PLATFORM_SERVICE_LABELS,
      ),
    });

    if (this.api.isCancel(platformServices)) {
      return null;
    }

    const isConfirmed = await this.api.confirm({
      message:
        "Confirm create configuration:\n" +
        `- Name: ${name}\n` +
        `- Runtime: ${RUNTIME_LABELS[runtime as RuntimeOption]}\n` +
        `- Framework: ${FRAMEWORK_LABELS[framework as FrameworkOption]}\n` +
        `- Databases: ${toLabelList(databases as DatabaseOption[], DATABASE_LABELS)}\n` +
        `- Platform services: ${toLabelList(
          platformServices as PlatformServiceOption[],
          PLATFORM_SERVICE_LABELS,
        )}`,
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
