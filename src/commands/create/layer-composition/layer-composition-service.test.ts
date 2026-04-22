import type { CreateSelections } from "../prompt/prompt.port.js";
import { LayerConflictError } from "../../../errors/cli-errors.js";
import { LayerCompositionService, LayerTemplateRenderer } from "./layer-composition-service.js";
import type { LayerRegistry } from "./layer-composition-service.js";

// ---------------------------------------------------------------------------
// Combination coverage helpers
// ---------------------------------------------------------------------------

const NODE_DATABASES = ["postgresql", "redis"] as const;
const NODE_SERVICES = ["auth", "email", "analytics"] as const;
const NODE_FRAMEWORKS = ["express", "typescript"] as const;
const NODE_PACKAGE_MANAGERS = ["pnpm", "bun"] as const;

const buildPowerSet = <T>(items: readonly T[]): T[][] => {
  const subsets: T[][] = [[]];

  for (const item of items) {
    const existing = [...subsets];

    for (const subset of existing) {
      subsets.push([...subset, item]);
    }
  }

  return subsets;
};

const toMultiSelect = <T extends string>(items: T[]): T[] =>
  items.length === 0 ? [] : [...items].sort();

const expectedNodeLayerNames = ({
  framework,
  packageManager,
  databases,
  platformServices,
}: {
  databases: CreateSelections["databases"];
  framework: (typeof NODE_FRAMEWORKS)[number];
  packageManager: (typeof NODE_PACKAGE_MANAGERS)[number];
  platformServices: CreateSelections["platformServices"];
}): string[] => {
  const serviceLayerSlugs = [...databases, ...platformServices]
    .map((v) => `services/${v}`)
    .sort((a, b) => a.localeCompare(b));

  return [
    "always",
    "runtime/node",
    `package-managers/${packageManager}`,
    `frameworks/${framework}`,
    ...serviceLayerSlugs,
  ];
};

interface NodeCase {
  databases: CreateSelections["databases"];
  databaseLabel: string;
  framework: (typeof NODE_FRAMEWORKS)[number];
  packageManager: (typeof NODE_PACKAGE_MANAGERS)[number];
  platformServices: CreateSelections["platformServices"];
  serviceLabel: string;
}

const databaseSubsets = buildPowerSet(NODE_DATABASES).map((s) => toMultiSelect([...s]));
const serviceSubsets = buildPowerSet(NODE_SERVICES).map((s) => toMultiSelect([...s]));

const nodeCombinations: NodeCase[] = NODE_PACKAGE_MANAGERS.flatMap((packageManager) =>
  NODE_FRAMEWORKS.flatMap((framework) =>
    databaseSubsets.flatMap((databases) =>
      serviceSubsets.map((platformServices) => ({
        databaseLabel: databases.join(","),
        databases: databases,
        framework,
        packageManager,
        platformServices: platformServices,
        serviceLabel: platformServices.join(","),
      })),
    ),
  ),
);

const nodeExpressSelection: CreateSelections = {
  confirmed: true,
  databases: ["redis", "postgresql"],
  framework: "express",
  name: "hello-universe",
  packageManager: "pnpm",
  platformServices: ["email", "auth"],
  runtime: "node",
};

const createService = (overrides?: Partial<LayerRegistry>) => {
  const base: LayerRegistry = {
    always: {
      always: {
        files: { ".gitignore": "dist\nnode_modules\n", "README.md": "# Hello Universe\n" },
      },
    },
    frameworks: {
      express: {
        devCopySource: "",
        files: {
          "package.json":
            '{"dependencies":{"express":"1.2.3"},"scripts":{"dev":"node --watch src/index.js"}}',
          "src/server.ts": "const start = (): void => {};\nexport { start };\n",
        },
        port: 3000,
        watchSync: [],
      },
      typescript: { devCopySource: "", files: {}, port: 3000, watchSync: [] },
    },
    "package-managers": {
      bun: { files: {} },
      pnpm: { files: {} },
    },
    runtime: {
      node: {
        baseImage: "node:22-alpine",
        files: {
          "package.json": '{"scripts":{"build":"tsc","dev":"node src/index.js"}}',
          "src/index.ts": "export { start } from './server.js';\n",
        },
      },
    },
    services: {
      auth: { files: { "config/services/auth.json": '{"service":"auth"}' } },
      email: { files: { "config/services/email.json": '{"service":"email"}' } },
      postgresql: { files: { "config/resources/postgresql.json": '{"resource":"postgresql"}' } },
      redis: { files: { "config/resources/redis.json": '{"resource":"redis"}' } },
    },
  };

  return new LayerCompositionService({
    always: base.always,
    frameworks: base.frameworks,
    "package-managers": base["package-managers"],
    runtime: { ...base.runtime, ...overrides?.runtime },
    services: { ...base.services, ...overrides?.services },
  });
};

describe(LayerCompositionService, () => {
  it("resolves layers in deterministic stage and sorted service order", () => {
    const service = createService();

    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.layers.map((layer) => layer.name)).toStrictEqual([
      "always",
      "runtime/node",
      "package-managers/pnpm",
      "frameworks/express",
      "services/auth",
      "services/email",
      "services/postgresql",
      "services/redis",
    ]);
  });

  it("returns the same resolved layer set for equivalent selections", () => {
    const service = createService();

    const firstResult = service.resolveLayers(nodeExpressSelection);
    const secondResult = service.resolveLayers({
      ...nodeExpressSelection,
      databases: ["postgresql", "redis"],
      platformServices: ["auth", "email"],
    });

    expect(secondResult).toStrictEqual(firstResult);
  });

  it("merges configuration files and lets later layers overwrite direct key conflicts", () => {
    const service = createService();

    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.files["package.json"]).toBe(
      '{"dependencies":{"express":"1.2.3"},"scripts":{"build":"tsc","dev":"node --watch src/index.js","preinstall":"npx only-allow pnpm"}}',
    );
  });

  it("fails with a typed error for non-configuration file collisions across stages", () => {
    const service = createService({
      runtime: { node: { baseImage: "", files: { "README.md": "# Replacement\n" } } },
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  it("fails with a typed error for same-stage collisions", () => {
    const service = createService({
      services: {
        auth: { files: { "config/services/shared.json": '{"service":"auth"}' } },
        email: { files: { "config/services/shared.json": '{"service":"email"}' } },
      },
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  it("resolves bun package manager layer for Node+bun selection", () => {
    const service = createService();

    const result = service.resolveLayers({
      ...nodeExpressSelection,
      packageManager: "bun",
    });

    expect(result.layers.map((layer) => layer.name)).toStrictEqual([
      "always",
      "runtime/node",
      "package-managers/bun",
      "frameworks/express",
      "services/auth",
      "services/email",
      "services/postgresql",
      "services/redis",
    ]);
  });

  describe("template rendering", () => {
    it("substitutes {{name}} in file content using the selection name", () => {
      const service = new LayerCompositionService({
        always: { always: { files: { "README.md": "# {{name}}\n" } } },
        frameworks: { typescript: { devCopySource: "", files: {}, port: 3000, watchSync: [] } },
        "package-managers": { pnpm: { files: {} } },
        runtime: { node: { baseImage: "", files: {} } },
        services: {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "typescript",
        name: "my-app",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["README.md"]).toBe("# my-app\n");
    });

    /**  This seems very brittle, since it cares about label wording. How about
     either isolating the SUT or mocking/injecting the label provider to avoid
     this?
    */
    //  oxlint-disable-next-line jest/no-disabled-tests
    it.skip("substitutes {{runtime}} and {{framework}} in file content", () => {
      const service = new LayerCompositionService({
        always: { always: { files: { "meta.txt": "rt={{runtime}} fw={{framework}}\n" } } },
        frameworks: { express: { devCopySource: "", files: {}, port: 3000, watchSync: [] } },
        "package-managers": { pnpm: { files: {} } },
        runtime: { node: { baseImage: "", files: {} } },
        services: {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "app",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["meta.txt"]).toBe("rt=Node.js (TypeScript) fw=Express\n");
    });

    it("leaves unknown placeholders in file content unchanged", () => {
      const service = new LayerCompositionService({
        always: { always: { files: { "note.txt": "{{name}} {{unknown}}\n" } } },
        frameworks: { typescript: { devCopySource: "", files: {}, port: 3000, watchSync: [] } },
        "package-managers": { pnpm: { files: {} } },
        runtime: { node: { baseImage: "", files: {} } },
        services: {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "typescript",
        name: "my-app",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["note.txt"]).toBe("my-app {{unknown}}\n");
    });
  });

  describe("yaml config serialisation", () => {
    const makeYamlService = (overrides?: Partial<LayerRegistry>) => {
      const base: LayerRegistry = {
        always: { always: { files: { "README.md": "# test\n" } } },
        frameworks: { express: { devCopySource: "", files: {}, port: 3000, watchSync: [] } },
        "package-managers": { pnpm: { files: {} } },
        runtime: {
          node: { baseImage: "", files: { "package.json": '{"name":"test"}' } },
          static: { baseImage: "", files: { "public/index.html": "<h1>test</h1>\n" } },
        },
        services: {},
      };

      return new LayerCompositionService({
        always: { ...base.always, ...overrides?.always },
        frameworks: { ...base.frameworks, ...overrides?.frameworks },
        "package-managers": { ...base["package-managers"], ...overrides?.["package-managers"] },
        runtime: { ...base.runtime, ...overrides?.runtime },
        services: { ...overrides?.services },
      });
    };

    it("merges YAML config files and emits valid YAML output", () => {
      const service = makeYamlService({
        always: {},
        frameworks: {
          express: {
            devCopySource: "",
            files: {
              "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n",
            },
            port: 3000,
            watchSync: [],
          },
        },
        runtime: {
          node: {
            baseImage: "",
            files: {
              "docker-compose.yaml": "version: '3'\nservices:\n  app:\n    image: node:22\n",
            },
          },
        },
        services: {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      const output = result.files["docker-compose.yaml"];

      expect(output).toBeDefined();
      expect(output).toContain("image: node:22");
      expect(output).toContain("3000:3000");
      expect(output).not.toContain("{");
    });

    it("merges .yml config files and emits valid YAML output", () => {
      const service = makeYamlService({
        frameworks: {
          express: {
            devCopySource: "",
            files: { "config.yml": "env: extended\n" },
            port: 3000,
            watchSync: [],
          },
        },
        runtime: {
          node: { baseImage: "", files: { "config.yml": "env: base\nshared: common\n" } },
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      const output = result.files["config.yml"];

      expect(output).toContain("env: extended");
      expect(output).toContain("shared: common");
      expect(output).not.toContain("{");
    });

    it("preserves JSON round-trip behavior unchanged", () => {
      const service = makeYamlService({
        frameworks: {
          express: {
            devCopySource: "",
            files: { "package.json": '{"dependencies":{"express":"5.1.0"}}' },
            port: 3000,
            watchSync: [],
          },
        },
        runtime: {
          node: { baseImage: "", files: { "package.json": '{"scripts":{"build":"tsc"}}' } },
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["package.json"]).toBe(
        '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc","preinstall":"npx only-allow pnpm"}}',
      );
    });

    it("resolves layers containing both JSON and YAML config files", () => {
      const service = makeYamlService({
        frameworks: {
          express: {
            devCopySource: "",
            files: {
              "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n",
              "package.json": '{"dependencies":{"express":"5.1.0"}}',
            },
            port: 3000,
            watchSync: [],
          },
        },
        runtime: {
          node: {
            baseImage: "",
            files: {
              "docker-compose.yaml": "services:\n  app:\n    image: node:22\n",
              "package.json": '{"scripts":{"build":"tsc"}}',
            },
          },
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["package.json"]).toBe(
        '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc","preinstall":"npx only-allow pnpm"}}',
      );
      expect(result.files["docker-compose.yaml"]).toContain("image: node:22");
      expect(result.files["docker-compose.yaml"]).toContain("3000:3000");
      expect(result.files["docker-compose.yaml"]).not.toContain("{");
    });
  });

  describe("combination coverage with default registry", () => {
    const service = new LayerCompositionService();

    // Isn't this an implementation detail?
    it("resolves Static to always, runtime/static_web, and frameworks/html-css-js", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "html-css-js",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "static_web",
      });

      expect(result.layers.map((layer) => layer.name)).toStrictEqual([
        "always",
        "runtime/static_web",
        "frameworks/html-css-js",
      ]);
    });

    it("emits a Dockerfile for node + express + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["Dockerfile"]).toBeDefined();
      expect(result.files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
      expect(result.files["Dockerfile"]).toContain("FROM base AS dev");
      expect(result.files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
    });

    it("emits a docker-compose.dev.yml for node + express + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["docker-compose.dev.yml"]).toBeDefined();
      expect(result.files["docker-compose.dev.yml"]).toContain("3000:3000");
      expect(result.files["docker-compose.dev.yml"]).toContain("target: dev");
    });

    it("emits a Dockerfile for node + typescript + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "typescript",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["Dockerfile"]).toBeDefined();
      expect(result.files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
      expect(result.files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
    });

    it("emits a docker-compose.dev.yml for node + typescript + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: [],
        framework: "typescript",
        name: "test",
        packageManager: "pnpm",
        platformServices: [],
        runtime: "node",
      });

      expect(result.files["docker-compose.dev.yml"]).toBeDefined();
      expect(result.files["docker-compose.dev.yml"]).toContain("3000:3000");
    });

    it.each(nodeCombinations)(
      "resolves Node.js + $framework + $packageManager + db:[$databaseLabel] + svc:[$serviceLabel]",
      ({ framework, packageManager, databases, platformServices }) => {
        const result = service.resolveLayers({
          confirmed: true,
          databases,
          framework,
          name: "test",
          packageManager,
          platformServices,
          runtime: "node",
        });

        expect(result.layers.map((layer) => layer.name)).toStrictEqual(
          expectedNodeLayerNames({ databases, framework, packageManager, platformServices }),
        );
      },
    );
  });
});

const rendererContext = {
  framework: "Express",
  name: "my-app",
  port: 3000,
  runtime: "Node.js (TypeScript)",
};

describe(LayerTemplateRenderer, () => {
  it("substitutes all defined variables in a template string", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render(
      "name={{name}} runtime={{runtime}} framework={{framework}}",
      rendererContext,
    );

    expect(result).toBe("name=my-app runtime=Node.js (TypeScript) framework=Express");
  });

  it("leaves unknown placeholders unchanged", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("hello={{unknown}} name={{name}}", rendererContext);

    expect(result).toBe("hello={{unknown}} name=my-app");
  });

  it("substitutes multiple occurrences of the same variable", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("{{name}}/{{name}}.ts", rendererContext);

    expect(result).toBe("my-app/my-app.ts");
  });

  it("substitutes {{port}} with the numeric port", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("port={{port}}", rendererContext);

    expect(result).toBe("port=3000");
  });

  it("returns the template unchanged when given an empty context", () => {
    const renderer = new LayerTemplateRenderer();

    const result = renderer.render("hello={{name}}", {
      framework: "",
      name: "",
      port: 0,
      runtime: "",
    });

    expect(result).toBe("hello=");
  });
});
