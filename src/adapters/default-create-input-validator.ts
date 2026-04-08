import {
  InvalidMultiSelectError,
  InvalidNameError,
  TargetDirectoryExistsError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
} from "../errors/cli-errors.js";
import type { CreateInputValidator } from "../ports/create-input-validator.js";
import type {
  CreateSelections,
  DatabaseOption,
  FrameworkOption,
  PlatformServiceOption,
} from "../ports/prompt-port.js";

type PathExists = (path: string) => boolean;

const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9-]{2,49}$/;

const NODE_RUNTIME = "Node.js (TypeScript)";
const STATIC_RUNTIME = "Static (HTML/CSS/JS)";
const NONE_VALUE = "None";

const SUPPORTED_NODE_FRAMEWORKS: FrameworkOption[] = ["Express", NONE_VALUE];
const SUPPORTED_NODE_DATABASES: DatabaseOption[] = ["PostgreSQL", "Redis", NONE_VALUE];
const SUPPORTED_NODE_SERVICES: PlatformServiceOption[] = ["Auth", "Email", "Analytics", NONE_VALUE];

class DefaultCreateInputValidator implements CreateInputValidator {
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

    throw new UnsupportedRuntimeError(input.runtime);
  }

  private validateNodeSelections(input: CreateSelections): void {
    if (!SUPPORTED_NODE_FRAMEWORKS.includes(input.framework)) {
      throw new UnsupportedFrameworkError(input.framework, input.runtime);
    }

    this.ensureNoneExclusive("databases", input.databases);
    this.ensureNoneExclusive("platform services", input.platformServices);

    this.ensureAllowedValues(input.databases, SUPPORTED_NODE_DATABASES, "databases");
    this.ensureAllowedValues(input.platformServices, SUPPORTED_NODE_SERVICES, "platform services");
  }

  private validateStaticSelections(input: CreateSelections): void {
    if (input.framework !== NONE_VALUE) {
      throw new UnsupportedFrameworkError(input.framework, input.runtime);
    }

    if (input.databases.length !== 1 || input.databases[0] !== NONE_VALUE) {
      throw new UnsupportedCombinationError("Static projects only support databases: None");
    }

    if (input.platformServices.length !== 1 || input.platformServices[0] !== NONE_VALUE) {
      throw new UnsupportedCombinationError("Static projects only support platform services: None");
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
        throw new UnsupportedCombinationError(`Unsupported ${field} value: ${value}`);
      }
    }
  }
}

export { DefaultCreateInputValidator };
export type { PathExists };
