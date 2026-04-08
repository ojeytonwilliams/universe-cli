import {
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
} from "./cli-errors.js";

describe("error exit codes", () => {
  it("assigns a unique exit code to each error type", () => {
    const errors = [
      new DeferredCommandError("register"),
      new InvalidMultiSelectError("databases"),
      new InvalidNameError("x"),
      new LayerConflictError("src/index.ts", "base/nodejs", "frameworks/express"),
      new MissingLayerError("base/nodejs"),
      new ScaffoldWriteError("/tmp/x", new Error("disk full")),
      new TargetDirectoryExistsError("/tmp/x"),
      new UnsupportedCombinationError("static + database"),
      new UnsupportedFrameworkError("fastify", "nodejs"),
      new UnsupportedRuntimeError("python"),
    ];

    const codes = errors.map((e) => e.exitCode);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(errors.length);
  });
});

describe(InvalidNameError, () => {
  it("includes the invalid name in the message", () => {
    const error = new InvalidNameError("bad_NAME");

    expect(error.message).toMatchInlineSnapshot(
      `"Invalid project name "bad_NAME". Names must be lowercase kebab-case, start with a letter, and be 3–50 characters long."`,
    );
  });
});

describe(TargetDirectoryExistsError, () => {
  it("includes the path in the message", () => {
    const error = new TargetDirectoryExistsError("/projects/my-app");

    expect(error.message).toMatchInlineSnapshot(
      `"Target directory already exists: "/projects/my-app". Choose a different name or remove the existing directory."`,
    );
  });
});

describe(UnsupportedRuntimeError, () => {
  it("includes the runtime name in the message", () => {
    const error = new UnsupportedRuntimeError("python");

    expect(error.message).toMatchInlineSnapshot(
      `"Runtime "python" is not supported in this spike. Supported runtimes: Node.js (TypeScript), Static."`,
    );
  });
});

describe(UnsupportedFrameworkError, () => {
  it("includes the framework and runtime in the message", () => {
    const error = new UnsupportedFrameworkError("fastify", "nodejs");

    expect(error.message).toMatchInlineSnapshot(
      `"Framework "fastify" is not supported for runtime "nodejs" in this spike."`,
    );
  });
});

describe(UnsupportedCombinationError, () => {
  it("includes the combination description in the message", () => {
    const error = new UnsupportedCombinationError("static + PostgreSQL");

    expect(error.message).toMatchInlineSnapshot(
      `"Unsupported combination in this spike: static + PostgreSQL."`,
    );
  });
});

describe(InvalidMultiSelectError, () => {
  it("includes the field name in the message", () => {
    const error = new InvalidMultiSelectError("databases");

    expect(error.message).toMatchInlineSnapshot(
      `"Invalid selection for "databases": "None" cannot be combined with other selections."`,
    );
  });
});

describe(MissingLayerError, () => {
  it("includes the layer path in the message", () => {
    const error = new MissingLayerError("base/nodejs");

    expect(error.message).toMatchInlineSnapshot(
      `"Required template layer not found: "base/nodejs"."`,
    );
  });
});

describe(LayerConflictError, () => {
  it("includes the file path and both layer names in the message", () => {
    const error = new LayerConflictError("src/index.ts", "base/nodejs", "frameworks/express");

    expect(error.message).toMatchInlineSnapshot(
      `"File path conflict: "src/index.ts" exists in both "base/nodejs" and "frameworks/express". Non-configuration files cannot be merged."`,
    );
  });
});

describe(ScaffoldWriteError, () => {
  it("includes the path and cause message", () => {
    const cause = new Error("disk full");
    const error = new ScaffoldWriteError("/projects/my-app", cause);

    expect(error.message).toMatchInlineSnapshot(
      `"Failed to write scaffold to "/projects/my-app": disk full"`,
    );
  });
});

describe(DeferredCommandError, () => {
  it("interpolates the command name into the message", () => {
    const error = new DeferredCommandError("register");

    expect(error.message).toMatchInlineSnapshot(
      `"The 'register' command is not yet implemented in this spike. It will be available in a future release."`,
    );
  });
});
