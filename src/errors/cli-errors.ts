const EXIT_CODES = {
  DEPLOYMENT: 10,
  INVALID_MULTI_SELECT: 5,
  INVALID_NAME: 17,
  LAYER: 6,
  LIST: 15,
  LOGS: 13,
  MANIFEST: 8,
  PROMOTION: 11,
  REGISTRATION: 9,
  ROLLBACK: 12,
  SCAFFOLD_WRITE: 7,
  STATUS: 14,
  TARGET_EXISTS: 3,
  TEARDOWN: 16,
  UNSUPPORTED: 4,
} as const;

type ErrorCode = keyof typeof EXIT_CODES;
type ErrorValue = (typeof EXIT_CODES)[ErrorCode];

class CliError extends Error {
  readonly exitCode: ErrorValue;

  constructor(message: string, exitCode: ErrorValue) {
    super(message);
    this.exitCode = exitCode;
    this.name = "CliError";
  }
}

class InvalidNameError extends CliError {
  constructor(name: string) {
    super(
      `Invalid project name "${name}". Names must be lowercase kebab-case, start with a letter, and be 3–50 characters long.`,
      EXIT_CODES.INVALID_NAME,
    );
    this.name = "InvalidNameError";
  }
}

class TargetDirectoryExistsError extends CliError {
  constructor(path: string) {
    super(
      `Target directory already exists: "${path}". Choose a different name or remove the existing directory.`,
      EXIT_CODES.TARGET_EXISTS,
    );
    this.name = "TargetDirectoryExistsError";
  }
}

class UnsupportedRuntimeError extends CliError {
  constructor(runtime: string) {
    super(
      `Runtime "${runtime}" is not supported in this spike. Supported runtimes: Node.js (TypeScript), Static.`,
      EXIT_CODES.UNSUPPORTED,
    );
    this.name = "UnsupportedRuntimeError";
  }
}

class UnsupportedFrameworkError extends CliError {
  constructor(framework: string, runtime: string) {
    super(
      `Framework "${framework}" is not supported for runtime "${runtime}" in this spike.`,
      EXIT_CODES.UNSUPPORTED,
    );
    this.name = "UnsupportedFrameworkError";
  }
}

class UnsupportedCombinationError extends CliError {
  constructor(description: string) {
    super(`Unsupported combination in this spike: ${description}.`, EXIT_CODES.UNSUPPORTED);
    this.name = "UnsupportedCombinationError";
  }
}

class InvalidMultiSelectError extends CliError {
  constructor(field: string) {
    super(
      `Invalid selection for "${field}": "None" cannot be combined with other selections.`,
      EXIT_CODES.INVALID_MULTI_SELECT,
    );
    this.name = "InvalidMultiSelectError";
  }
}

class MissingLayerError extends CliError {
  constructor(layerPath: string) {
    super(`Required template layer not found: "${layerPath}".`, EXIT_CODES.LAYER);
    this.name = "MissingLayerError";
  }
}

class LayerConflictError extends CliError {
  constructor(filePath: string, layerA: string, layerB: string) {
    super(
      `File path conflict: "${filePath}" exists in both "${layerA}" and "${layerB}". Non-configuration files cannot be merged.`,
      EXIT_CODES.LAYER,
    );
    this.name = "LayerConflictError";
  }
}

class ScaffoldWriteError extends CliError {
  constructor(path: string, cause: Error) {
    super(`Failed to write scaffold to "${path}": ${cause.message}`, EXIT_CODES.SCAFFOLD_WRITE);
    this.name = "ScaffoldWriteError";
    this.cause = cause;
  }
}

class ManifestNotFoundError extends CliError {
  constructor(path: string) {
    super(
      `Platform manifest not found at "${path}". Run "universe create" to scaffold a project first.`,
      EXIT_CODES.MANIFEST,
    );
    this.name = "ManifestNotFoundError";
  }
}

class ManifestInvalidError extends CliError {
  constructor(path: string, reason: string) {
    super(`Platform manifest at "${path}" is invalid: ${reason}`, EXIT_CODES.MANIFEST);
    this.name = "ManifestInvalidError";
  }
}

class RegistrationError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to register project "${name}": ${reason}`, EXIT_CODES.REGISTRATION);
    this.name = "RegistrationError";
  }
}

class DeploymentError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to deploy project "${name}": ${reason}`, EXIT_CODES.DEPLOYMENT);
    this.name = "DeploymentError";
  }
}

class LogsError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to retrieve logs for project "${name}": ${reason}`, EXIT_CODES.LOGS);
    this.name = "LogsError";
  }
}

class PromotionError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to promote project "${name}": ${reason}`, EXIT_CODES.PROMOTION);
    this.name = "PromotionError";
  }
}

class RollbackError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to roll back project "${name}": ${reason}`, EXIT_CODES.ROLLBACK);
    this.name = "RollbackError";
  }
}

class StatusError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to retrieve status for project "${name}": ${reason}`, EXIT_CODES.STATUS);
    this.name = "StatusError";
  }
}

class ListError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to list deployments for project "${name}": ${reason}`, EXIT_CODES.LIST);
    this.name = "ListError";
  }
}

class TeardownError extends CliError {
  constructor(name: string, reason: string) {
    super(`Failed to tear down project "${name}": ${reason}`, EXIT_CODES.TEARDOWN);
    this.name = "TeardownError";
  }
}

export {
  CliError,
  DeploymentError,
  InvalidMultiSelectError,
  InvalidNameError,
  LayerConflictError,
  ListError,
  LogsError,
  ManifestInvalidError,
  ManifestNotFoundError,
  MissingLayerError,
  PromotionError,
  RegistrationError,
  RollbackError,
  ScaffoldWriteError,
  StatusError,
  TargetDirectoryExistsError,
  TeardownError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
};
