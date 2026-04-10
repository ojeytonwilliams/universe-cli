import { range } from "lodash";

import {
  BadArgumentsError,
  CreateUnsupportedCombinationError,
  CreateUnsupportedFrameworkError,
  CreateUnsupportedRuntimeError,
  CliError,
  DeploymentError,
  InvalidMultiSelectError,
  InvalidNameError,
  LayerConflictError,
  ListError,
  ManifestInvalidError,
  ManifestNotFoundError,
  MissingLayerError,
  RegistrationError,
  ScaffoldWriteError,
  StatusError,
  TargetDirectoryExistsError,
  TeardownError,
} from "./cli-errors.js";

describe("error exit codes", () => {
  let errors: CliError[];

  beforeAll(() => {
    errors = [
      new DeploymentError("my-app", "timeout"),
      new InvalidMultiSelectError("databases"),
      new InvalidNameError("x"),
      new LayerConflictError("src/index.ts", "base/nodejs", "frameworks/express"),
      new ManifestInvalidError("/projects/my-app/platform.yaml", "missing field: name"),
      new ManifestNotFoundError("/projects/my-app/platform.yaml"),
      new MissingLayerError("base/nodejs"),
      new ListError("my-app", "unavailable"),
      new RegistrationError("my-app", "already registered"),
      new ScaffoldWriteError("/tmp/x", new Error("disk full")),
      new StatusError("my-app", "unavailable"),
      new TargetDirectoryExistsError("/tmp/x"),
      new TeardownError("my-app", "unavailable"),
      new CreateUnsupportedCombinationError("static + database"),
      new CreateUnsupportedFrameworkError("fastify", "nodejs"),
      new CreateUnsupportedRuntimeError("python"),
      new BadArgumentsError("bad args"),
    ];
  });

  it("avoids exit codes with special meanings", () => {
    const codes = errors.map((e) => e.exitCode);

    // Not including 126
    const allowedCodes = range(3, 126);

    for (const code of codes) {
      expect(allowedCodes).toContain(code);
    }
  });
});

describe(CliError, () => {
  it("acts as the shared base class for typed CLI errors", () => {
    const error = new InvalidNameError("bad-name");

    expect(error).toBeInstanceOf(CliError);
  });
});

describe(BadArgumentsError, () => {
  it("passes the message through without modification", () => {
    const error = new BadArgumentsError("bad args");

    expect(error.message).toBe("bad args");
  });
});

describe(InvalidNameError, () => {
  it("includes the invalid name in the message", () => {
    const error = new InvalidNameError("bad_NAME");

    expect(error.message).toBe(
      'Invalid project name "bad_NAME". Names must be lowercase kebab-case, start with a letter, and be 3–50 characters long.',
    );
  });
});

describe(TargetDirectoryExistsError, () => {
  it("includes the path in the message", () => {
    const error = new TargetDirectoryExistsError("/projects/my-app");

    expect(error.message).toBe(
      'Target directory already exists: "/projects/my-app". Choose a different name or remove the existing directory.',
    );
  });
});

describe(CreateUnsupportedRuntimeError, () => {
  it("includes the runtime name in the message", () => {
    const error = new CreateUnsupportedRuntimeError("python");

    expect(error.message).toBe(
      'Runtime "python" is not supported in this spike. Supported runtimes: Node.js (TypeScript), Static.',
    );
  });
});

describe(CreateUnsupportedFrameworkError, () => {
  it("includes the framework and runtime in the message", () => {
    const error = new CreateUnsupportedFrameworkError("fastify", "nodejs");

    expect(error.message).toBe(
      'Framework "fastify" is not supported for runtime "nodejs" in this spike.',
    );
  });
});

describe(CreateUnsupportedCombinationError, () => {
  it("includes the combination description in the message", () => {
    const error = new CreateUnsupportedCombinationError("static + PostgreSQL");

    expect(error.message).toBe("Unsupported combination in this spike: static + PostgreSQL.");
  });
});

describe(InvalidMultiSelectError, () => {
  it("includes the field name in the message", () => {
    const error = new InvalidMultiSelectError("databases");

    expect(error.message).toBe(
      'Invalid selection for "databases": "None" cannot be combined with other selections.',
    );
  });
});

describe(MissingLayerError, () => {
  it("includes the layer path in the message", () => {
    const error = new MissingLayerError("base/nodejs");

    expect(error.message).toBe('Required template layer not found: "base/nodejs".');
  });
});

describe(LayerConflictError, () => {
  it("includes the file path and both layer names in the message", () => {
    const error = new LayerConflictError("src/index.ts", "base/nodejs", "frameworks/express");

    expect(error.message).toBe(
      'File path conflict: "src/index.ts" exists in both "base/nodejs" and "frameworks/express". Non-configuration files cannot be merged.',
    );
  });
});

describe(ScaffoldWriteError, () => {
  it("includes the path and cause message", () => {
    const cause = new Error("disk full");
    const error = new ScaffoldWriteError("/projects/my-app", cause);

    expect(error.message).toBe('Failed to write scaffold to "/projects/my-app": disk full');
  });
});

describe(ManifestNotFoundError, () => {
  it("includes the attempted path in the message", () => {
    const error = new ManifestNotFoundError("/projects/my-app/platform.yaml");

    expect(error.message).toBe(
      'Platform manifest not found at "/projects/my-app/platform.yaml". Run "universe create" to scaffold a project first.',
    );
  });
});

describe(ManifestInvalidError, () => {
  it("includes the path and reason in the message", () => {
    const error = new ManifestInvalidError("/projects/my-app/platform.yaml", "missing field: name");

    expect(error.message).toBe(
      'Platform manifest at "/projects/my-app/platform.yaml" is invalid: missing field: name',
    );
  });
});

describe(RegistrationError, () => {
  it("includes the project name and reason in the message", () => {
    const error = new RegistrationError("my-app", "already registered");

    expect(error.message).toBe('Failed to register project "my-app": already registered');
  });
});

describe(DeploymentError, () => {
  it("includes the project name and reason in the message", () => {
    const error = new DeploymentError("my-app", "timeout");

    expect(error.message).toBe('Failed to deploy project "my-app": timeout');
  });
});

describe(StatusError, () => {
  it("includes the project name and reason in the message", () => {
    const error = new StatusError("my-app", "unavailable");

    expect(error.message).toBe('Failed to retrieve status for project "my-app": unavailable');
  });
});

describe(ListError, () => {
  it("includes the project name and reason in the message", () => {
    const error = new ListError("my-app", "unavailable");

    expect(error.message).toBe('Failed to list deployments for project "my-app": unavailable');
  });
});

describe(TeardownError, () => {
  it("includes the project name and reason in the message", () => {
    const error = new TeardownError("my-app", "unavailable");

    expect(error.message).toBe('Failed to tear down project "my-app": unavailable');
    expect(error.exitCode).toBe(16);
  });
});
