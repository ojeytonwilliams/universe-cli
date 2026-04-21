import { confirm, isCancel, multiselect, select, text } from "@clack/prompts";
import {
  DATABASE_LABELS,
  FRAMEWORK_LABELS,
  PACKAGE_MANAGER_LABELS,
  PLATFORM_SERVICE_LABELS,
  RUNTIME_LABELS,
} from "./prompt.port.js";
import type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PackageManagerOption,
  PlatformServiceOption,
  Prompt,
  RuntimeOption,
} from "./prompt.port.js";
import {
  databaseOptions,
  frameworkOptions,
  packageManagerOptions,
  runtimeOptions,
  serviceOptions,
} from "../layer-composition/allowed-configuration.js";
import { getLabel } from "../layer-composition/labels.js";
import type { LabelCategory } from "../layer-composition/labels.js";

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

const toPromptOptions = <T extends string>(
  values: T[],
  category: LabelCategory,
): { label: string; value: T }[] =>
  values.map((value) => ({
    label: getLabel(category, value),
    value,
  }));

const toLabelList = <T extends string>(values: T[], labels: Record<T, string>): string =>
  values.map((value) => labels[value]).join(", ");

class ClackPrompt implements Prompt {
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
      options: toPromptOptions(runtimeOptions(), "runtime"),
    });

    if (this.api.isCancel(runtime)) {
      return null;
    }

    const framework = await this.api.select({
      message: "Select framework",
      options: toPromptOptions(frameworkOptions(runtime as RuntimeOption), "framework"),
    });

    if (this.api.isCancel(framework)) {
      return null;
    }

    let packageManager: string | symbol | undefined;
    const packageManagers = packageManagerOptions(runtime as RuntimeOption);
    if (packageManagers.length === 1) {
      const [autoSelected] = packageManagers;
      if (autoSelected !== undefined) {
        packageManager = autoSelected;
      }
    } else if (packageManagers.length > 1) {
      packageManager = await this.api.select({
        message: "Select package manager",
        options: toPromptOptions(packageManagers as PackageManagerOption[], "packageManager"),
      });

      if (this.api.isCancel(packageManager)) {
        return null;
      }
    }

    const databases = await this.api.multiselect({
      message: "Select databases",
      options: toPromptOptions(databaseOptions(runtime as RuntimeOption), "database"),
    });

    if (this.api.isCancel(databases)) {
      return null;
    }

    const platformServices = await this.api.multiselect({
      message: "Select platform services",
      options: toPromptOptions(serviceOptions(runtime as RuntimeOption), "service"),
    });

    if (this.api.isCancel(platformServices)) {
      return null;
    }

    const confirmLines = [
      "Confirm create configuration:",
      `- Name: ${name}`,
      `- Runtime: ${RUNTIME_LABELS[runtime as RuntimeOption]}`,
      `- Framework: ${FRAMEWORK_LABELS[framework as FrameworkOption]}`,
    ];

    if (packageManager !== undefined) {
      confirmLines.push(
        `- Package manager: ${PACKAGE_MANAGER_LABELS[packageManager as PackageManagerOption]}`,
      );
    }

    confirmLines.push(
      `- Databases: ${toLabelList(databases as DatabaseOption[], DATABASE_LABELS)}`,
      `- Platform services: ${toLabelList(platformServices as PlatformServiceOption[], PLATFORM_SERVICE_LABELS)}`,
    );

    const isConfirmed = await this.api.confirm({
      message: confirmLines.join("\n"),
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
      ...(packageManager !== undefined && {
        packageManager: packageManager as PackageManagerOption,
      }),
    };
  }
}

export { ClackPrompt };
export type { ClackPromptApi };
