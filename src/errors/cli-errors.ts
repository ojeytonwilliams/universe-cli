const EXIT_CODES = {
  DEFERRED_COMMAND: 1,
  DEPLOYMENT: 14,
  INVALID_MULTI_SELECT: 7,
  INVALID_NAME: 2,
  LAYER_CONFLICT: 9,
  MANIFEST_INVALID: 12,
  MANIFEST_NOT_FOUND: 11,
  MISSING_LAYER: 8,
  REGISTRATION: 13,
  SCAFFOLD_WRITE: 10,
  TARGET_EXISTS: 3,
  UNSUPPORTED_COMBINATION: 6,
  UNSUPPORTED_FRAMEWORK: 5,
  UNSUPPORTED_RUNTIME: 4,
} as const;

const DEFERRED_COMMAND_MESSAGE_TEMPLATE =
  "The '{command}' command is not yet implemented in this spike. It will be available in a future release.";

class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
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
      EXIT_CODES.UNSUPPORTED_RUNTIME,
    );
    this.name = "UnsupportedRuntimeError";
  }
}

class UnsupportedFrameworkError extends CliError {
  constructor(framework: string, runtime: string) {
    super(
      `Framework "${framework}" is not supported for runtime "${runtime}" in this spike.`,
      EXIT_CODES.UNSUPPORTED_FRAMEWORK,
    );
    this.name = "UnsupportedFrameworkError";
  }
}

class UnsupportedCombinationError extends CliError {
  constructor(description: string) {
    super(
      `Unsupported combination in this spike: ${description}.`,
      EXIT_CODES.UNSUPPORTED_COMBINATION,
    );
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
    super(`Required template layer not found: "${layerPath}".`, EXIT_CODES.MISSING_LAYER);
    this.name = "MissingLayerError";
  }
}

class LayerConflictError extends CliError {
  constructor(filePath: string, layerA: string, layerB: string) {
    super(
      `File path conflict: "${filePath}" exists in both "${layerA}" and "${layerB}". Non-configuration files cannot be merged.`,
      EXIT_CODES.LAYER_CONFLICT,
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
      EXIT_CODES.MANIFEST_NOT_FOUND,
    );
    this.name = "ManifestNotFoundError";
  }
}

class ManifestInvalidError extends CliError {
  constructor(path: string, reason: string) {
    super(`Platform manifest at "${path}" is invalid: ${reason}`, EXIT_CODES.MANIFEST_INVALID);
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

class DeferredCommandError extends CliError {
  constructor(command: string) {
    super(
      DEFERRED_COMMAND_MESSAGE_TEMPLATE.replace("{command}", command),
      EXIT_CODES.DEFERRED_COMMAND,
    );
    this.name = "DeferredCommandError";
  }
}

export {
  CliError,
  DeferredCommandError,
  DeploymentError,
  InvalidMultiSelectError,
  InvalidNameError,
  LayerConflictError,
  ManifestInvalidError,
  ManifestNotFoundError,
  MissingLayerError,
  RegistrationError,
  ScaffoldWriteError,
  TargetDirectoryExistsError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
};
