import {
  CreateUnsupportedCombinationError,
  CreateUnsupportedFrameworkError,
  CreateUnsupportedRuntimeError,
  InvalidMultiSelectError,
  InvalidNameError,
  TargetDirectoryExistsError,
} from "../errors/cli-errors.js";
import {
  DATABASE_OPTIONS,
  FRAMEWORK_LABELS,
  FRAMEWORK_OPTIONS,
  PACKAGE_MANAGER_OPTIONS,
  PLATFORM_SERVICE_OPTIONS,
  RUNTIME_LABELS,
  RUNTIME_OPTIONS,
} from "../ports/prompt.js";
import type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PackageManagerOption,
  PlatformServiceOption,
  RuntimeOption,
} from "../ports/prompt.js";

type PathExists = (path: string) => boolean;

const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9-]{2,49}$/;

const NODE_RUNTIME = RUNTIME_OPTIONS.NODE;
const STATIC_RUNTIME = RUNTIME_OPTIONS.STATIC_WEB;
const NONE_VALUE = DATABASE_OPTIONS.NONE;

const SUPPORTED_NODE_FRAMEWORKS: FrameworkOption[] = [
  FRAMEWORK_OPTIONS.TYPESCRIPT,
  FRAMEWORK_OPTIONS.EXPRESS,
  FRAMEWORK_OPTIONS.NONE,
];
const SUPPORTED_NODE_DATABASES: DatabaseOption[] = [
  DATABASE_OPTIONS.POSTGRESQL,
  DATABASE_OPTIONS.REDIS,
  DATABASE_OPTIONS.NONE,
];
const SUPPORTED_NODE_SERVICES: PlatformServiceOption[] = [
  PLATFORM_SERVICE_OPTIONS.AUTH,
  PLATFORM_SERVICE_OPTIONS.EMAIL,
  PLATFORM_SERVICE_OPTIONS.ANALYTICS,
  PLATFORM_SERVICE_OPTIONS.NONE,
];
const SUPPORTED_NODE_PACKAGE_MANAGERS: PackageManagerOption[] = [
  PACKAGE_MANAGER_OPTIONS.PNPM,
  PACKAGE_MANAGER_OPTIONS.BUN,
];

const getRuntimeLabel = (runtime: string): string => {
  if (runtime in RUNTIME_LABELS) {
    return RUNTIME_LABELS[runtime as RuntimeOption];
  }

  return runtime;
};

const getFrameworkLabel = (framework: string): string => {
  if (framework in FRAMEWORK_LABELS) {
    return FRAMEWORK_LABELS[framework as FrameworkOption];
  }

  return framework;
};

interface CreateInputValidator {
  validateCreateInput(input: CreateSelections): CreateSelections;
}

class CreateInputValidationService implements CreateInputValidator {
  private readonly pathExists: PathExists;

  constructor(pathExists: PathExists) {
    this.pathExists = pathExists;
  }

  validateCreateInput(input: CreateSelections): CreateSelections {
    this.validateName(input.name);

    if (this.pathExists(input.name)) {
      throw new TargetDirectoryExistsError(input.name);
    }

    this.validateRuntimeAndCombinations(input);

    return input;
  }

  private validateName(name: string): void {
    if (PROJECT_NAME_PATTERN.test(name)) {
      return;
    }

    throw new InvalidNameError(name);
  }

  private validateRuntimeAndCombinations(input: CreateSelections): void {
    if (input.runtime === NODE_RUNTIME) {
      this.validateNodeSelections(input);
      return;
    }

    if (input.runtime === STATIC_RUNTIME) {
      this.validateStaticSelections(input);
      return;
    }

    throw new CreateUnsupportedRuntimeError(getRuntimeLabel(input.runtime));
  }

  private validateNodeSelections(input: CreateSelections): void {
    if (!SUPPORTED_NODE_FRAMEWORKS.includes(input.framework)) {
      throw new CreateUnsupportedFrameworkError(
        getFrameworkLabel(input.framework),
        getRuntimeLabel(input.runtime),
      );
    }

    if (
      input.packageManager === undefined ||
      !SUPPORTED_NODE_PACKAGE_MANAGERS.includes(input.packageManager)
    ) {
      throw new CreateUnsupportedCombinationError(
        `Node runtime requires a supported package manager (${SUPPORTED_NODE_PACKAGE_MANAGERS.join(", ")})`,
      );
    }

    this.ensureNoneExclusive("databases", input.databases);
    this.ensureNoneExclusive("platform services", input.platformServices);

    this.ensureAllowedValues(input.databases, SUPPORTED_NODE_DATABASES, "databases");
    this.ensureAllowedValues(input.platformServices, SUPPORTED_NODE_SERVICES, "platform services");
  }

  private validateStaticSelections(input: CreateSelections): void {
    if (input.framework !== FRAMEWORK_OPTIONS.NONE) {
      throw new CreateUnsupportedFrameworkError(
        getFrameworkLabel(input.framework),
        getRuntimeLabel(input.runtime),
      );
    }

    if (input.packageManager !== undefined) {
      throw new CreateUnsupportedCombinationError(
        "Static projects do not support a package manager",
      );
    }

    if (input.databases.length !== 1 || input.databases[0] !== DATABASE_OPTIONS.NONE) {
      throw new CreateUnsupportedCombinationError("Static projects only support databases: None");
    }

    if (
      input.platformServices.length !== 1 ||
      input.platformServices[0] !== PLATFORM_SERVICE_OPTIONS.NONE
    ) {
      throw new CreateUnsupportedCombinationError(
        "Static projects only support platform services: None",
      );
    }
  }

  private ensureNoneExclusive(field: string, values: string[]): void {
    if (!values.includes(NONE_VALUE)) {
      return;
    }

    if (values.length > 1) {
      throw new InvalidMultiSelectError(field);
    }
  }

  private ensureAllowedValues(values: string[], allowedValues: string[], field: string): void {
    for (const value of values) {
      if (!allowedValues.includes(value)) {
        throw new CreateUnsupportedCombinationError(`Unsupported ${field} value: ${value}`);
      }
    }
  }
}

export { CreateInputValidationService };
export type { PathExists, CreateInputValidator };
