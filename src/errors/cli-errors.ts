const EXIT_CODES = {
  DEFERRED_COMMAND: 1,
  INVALID_MULTI_SELECT: 7,
  INVALID_NAME: 2,
  LAYER_CONFLICT: 9,
  MISSING_LAYER: 8,
  SCAFFOLD_WRITE: 10,
  TARGET_EXISTS: 3,
  UNSUPPORTED_COMBINATION: 6,
  UNSUPPORTED_FRAMEWORK: 5,
  UNSUPPORTED_RUNTIME: 4,
} as const;

const DEFERRED_COMMAND_MESSAGE_TEMPLATE =
  "The '{command}' command is not yet implemented in this spike. It will be available in a future release.";

class InvalidNameError extends Error {
  readonly exitCode = EXIT_CODES.INVALID_NAME;

  constructor(name: string) {
    super(
      `Invalid project name "${name}". Names must be lowercase kebab-case, start with a letter, and be 3–50 characters long.`,
    );
    this.name = "InvalidNameError";
  }
}

class TargetDirectoryExistsError extends Error {
  readonly exitCode = EXIT_CODES.TARGET_EXISTS;

  constructor(path: string) {
    super(
      `Target directory already exists: "${path}". Choose a different name or remove the existing directory.`,
    );
    this.name = "TargetDirectoryExistsError";
  }
}

class UnsupportedRuntimeError extends Error {
  readonly exitCode = EXIT_CODES.UNSUPPORTED_RUNTIME;

  constructor(runtime: string) {
    super(
      `Runtime "${runtime}" is not supported in this spike. Supported runtimes: Node.js (TypeScript), Static.`,
    );
    this.name = "UnsupportedRuntimeError";
  }
}

class UnsupportedFrameworkError extends Error {
  readonly exitCode = EXIT_CODES.UNSUPPORTED_FRAMEWORK;

  constructor(framework: string, runtime: string) {
    super(`Framework "${framework}" is not supported for runtime "${runtime}" in this spike.`);
    this.name = "UnsupportedFrameworkError";
  }
}

class UnsupportedCombinationError extends Error {
  readonly exitCode = EXIT_CODES.UNSUPPORTED_COMBINATION;

  constructor(description: string) {
    super(`Unsupported combination in this spike: ${description}.`);
    this.name = "UnsupportedCombinationError";
  }
}

class InvalidMultiSelectError extends Error {
  readonly exitCode = EXIT_CODES.INVALID_MULTI_SELECT;

  constructor(field: string) {
    super(`Invalid selection for "${field}": "None" cannot be combined with other selections.`);
    this.name = "InvalidMultiSelectError";
  }
}

class MissingLayerError extends Error {
  readonly exitCode = EXIT_CODES.MISSING_LAYER;

  constructor(layerPath: string) {
    super(`Required template layer not found: "${layerPath}".`);
    this.name = "MissingLayerError";
  }
}

class LayerConflictError extends Error {
  readonly exitCode = EXIT_CODES.LAYER_CONFLICT;

  constructor(filePath: string, layerA: string, layerB: string) {
    super(
      `File path conflict: "${filePath}" exists in both "${layerA}" and "${layerB}". Non-configuration files cannot be merged.`,
    );
    this.name = "LayerConflictError";
  }
}

class ScaffoldWriteError extends Error {
  readonly exitCode = EXIT_CODES.SCAFFOLD_WRITE;

  constructor(path: string, cause: Error) {
    super(`Failed to write scaffold to "${path}": ${cause.message}`);
    this.name = "ScaffoldWriteError";
    this.cause = cause;
  }
}

class DeferredCommandError extends Error {
  readonly exitCode = EXIT_CODES.DEFERRED_COMMAND;

  constructor(command: string) {
    super(DEFERRED_COMMAND_MESSAGE_TEMPLATE.replace("{command}", command));
    this.name = "DeferredCommandError";
  }
}

export {
  DeferredCommandError,
  InvalidMultiSelectError,
  InvalidNameError,
  LayerConflictError,
  MissingLayerError,
  ScaffoldWriteError,
  TargetDirectoryExistsError,
  UnsupportedCombinationError,
  UnsupportedFrameworkError,
  UnsupportedRuntimeError,
};
