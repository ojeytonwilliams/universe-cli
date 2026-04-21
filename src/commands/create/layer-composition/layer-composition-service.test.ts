import { parse as parseYaml } from "yaml";
import { allowedCombinations } from "../allowed-layer-combinations.js";
import type {
  CreateSelections,
  FrameworkOption,
  PackageManagerOption,
  RuntimeOption,
} from "../prompt/prompt.port.js";
import { LayerConflictError, MissingLayerError } from "../../../errors/cli-errors.js";
import { LayerCompositionService, LayerTemplateRenderer } from "./layer-composition-service.js";
import type { LayerData } from "./layer-composition-service.js";
import { typedFrameworkLayers } from "./layers/frameworks-layer.js";

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

const toMultiSelect = <T extends string>(items: T[]): (T | "none")[] =>
  items.length === 0 ? ["none"] : ([...items].sort() as (T | "none")[]);

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
  const serviceLayerSlugs = [
    ...databases.filter((d) => d !== "none"),
    ...platformServices.filter((s) => s !== "none"),
  ]
    .map((v) => `services/${v}`)
    .sort((a, b) => a.localeCompare(b));

  return [
    "always",
    "base/node",
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
        databases: databases as CreateSelections["databases"],
        framework,
        packageManager,
        platformServices: platformServices as CreateSelections["platformServices"],
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

const createService = (overrides?: Record<string, LayerData | undefined>) =>
  new LayerCompositionService({
    always: {
      files: {
        ".gitignore": "dist\nnode_modules\n",
        "README.md": "# Hello Universe\n",
      },
    },
    "base/node": {
      files: {
        "package.json": '{"scripts":{"build":"tsc","dev":"node src/index.js"}}',
        "src/index.ts": "export { start } from './server.js';\n",
      },
    },
    "frameworks/express": {
      files: {
        "package.json":
          '{"dependencies":{"express":"1.2.3"},"scripts":{"dev":"node --watch src/index.js"}}',
        "src/server.ts": "const start = (): void => {};\nexport { start };\n",
      },
    },
    "frameworks/typescript": { files: {} },
    "package-managers/bun": {
      files: {
        "start.sh": "bun install && bun dev\n",
      },
    },
    "package-managers/pnpm": {
      files: {
        "start.sh": "pnpm install && pnpm dev\n",
      },
    },
    "services/auth": {
      files: {
        "config/services/auth.json": '{"service":"auth"}',
      },
    },
    "services/email": {
      files: {
        "config/services/email.json": '{"service":"email"}',
      },
    },
    "services/postgresql": {
      files: {
        "config/resources/postgresql.json": '{"resource":"postgresql"}',
      },
    },
    "services/redis": {
      files: {
        "config/resources/redis.json": '{"resource":"redis"}',
      },
    },
    ...overrides,
  });

describe(LayerCompositionService, () => {
  it("resolves layers in deterministic stage and sorted service order", () => {
    const service = createService();

    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.layers.map((layer) => layer.name)).toStrictEqual([
      "always",
      "base/node",
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
      '{"dependencies":{"express":"1.2.3"},"scripts":{"build":"tsc","dev":"node --watch src/index.js"}}',
    );
  });

  it("fails with a typed error when a required layer is missing", () => {
    const service = createService({
      "frameworks/express": undefined,
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(MissingLayerError);
  });

  it("fails with a typed error for non-configuration file collisions across stages", () => {
    const service = createService({
      "base/node": {
        files: { "README.md": "# Replacement\n" },
      },
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  it("fails with a typed error for same-stage collisions", () => {
    const service = createService({
      "services/auth": {
        files: { "config/services/shared.json": '{"service":"auth"}' },
      },
      "services/email": {
        files: { "config/services/shared.json": '{"service":"email"}' },
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
      "base/node",
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
        always: { files: { "README.md": "# {{name}}\n" } },
        "base/node": { files: {} },
        "frameworks/typescript": { files: {} },
        "package-managers/pnpm": { files: {} },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "typescript",
        name: "my-app",
        packageManager: "pnpm",
        platformServices: ["none"],
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
        always: { files: { "meta.txt": "rt={{runtime}} fw={{framework}}\n" } },
        "base/node": { files: {} },
        "frameworks/express": { files: {} },
        "package-managers/pnpm": { files: {} },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "app",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["meta.txt"]).toBe("rt=Node.js (TypeScript) fw=Express\n");
    });

    it("leaves unknown placeholders in file content unchanged", () => {
      const service = new LayerCompositionService({
        always: { files: { "note.txt": "{{name}} {{unknown}}\n" } },
        "base/node": { files: {} },
        "frameworks/typescript": { files: {} },
        "package-managers/pnpm": { files: {} },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "typescript",
        name: "my-app",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["note.txt"]).toBe("my-app {{unknown}}\n");
    });
  });

  describe("yaml config serialisation", () => {
    const makeYamlService = (overrides?: Record<string, LayerData>) =>
      new LayerCompositionService({
        always: { files: { "README.md": "# test\n" } },
        "base/node": { files: { "package.json": '{"name":"test"}' } },
        "base/static": { files: { "public/index.html": "<h1>test</h1>\n" } },
        "frameworks/express": { files: {} },
        "package-managers/pnpm": { files: {} },
        ...overrides,
      });

    it("merges YAML config files and emits valid YAML output", () => {
      const service = makeYamlService({
        "base/node": {
          files: { "docker-compose.yaml": "version: '3'\nservices:\n  app:\n    image: node:22\n" },
        },
        "frameworks/express": {
          files: { "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n" },
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
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
        "base/node": { files: { "config.yml": "env: base\nshared: common\n" } },
        "frameworks/express": { files: { "config.yml": "env: extended\n" } },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      const output = result.files["config.yml"];

      expect(output).toContain("env: extended");
      expect(output).toContain("shared: common");
      expect(output).not.toContain("{");
    });

    it("preserves JSON round-trip behavior unchanged", () => {
      const service = makeYamlService({
        "base/node": { files: { "package.json": '{"scripts":{"build":"tsc"}}' } },
        "frameworks/express": { files: { "package.json": '{"dependencies":{"express":"5.1.0"}}' } },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["package.json"]).toBe(
        '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc"}}',
      );
    });

    it("resolves layers containing both JSON and YAML config files", () => {
      const service = makeYamlService({
        "base/node": {
          files: {
            "docker-compose.yaml": "services:\n  app:\n    image: node:22\n",
            "package.json": '{"scripts":{"build":"tsc"}}',
          },
        },
        "frameworks/express": {
          files: {
            "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n",
            "package.json": '{"dependencies":{"express":"5.1.0"}}',
          },
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["package.json"]).toBe(
        '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc"}}',
      );
      expect(result.files["docker-compose.yaml"]).toContain("image: node:22");
      expect(result.files["docker-compose.yaml"]).toContain("3000:3000");
      expect(result.files["docker-compose.yaml"]).not.toContain("{");
    });
  });

  describe("combination coverage with default registry", () => {
    const service = new LayerCompositionService();

    it("resolves Static to always, base/static, and frameworks/html-css-js", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "html-css-js",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "static_web",
      });

      expect(result.layers.map((layer) => layer.name)).toStrictEqual([
        "always",
        "base/static",
        "frameworks/html-css-js",
      ]);
    });

    it("emits a Dockerfile for node + express + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
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
        databases: ["none"],
        framework: "express",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["docker-compose.dev.yml"]).toBeDefined();
      expect(result.files["docker-compose.dev.yml"]).toContain("3000:3000");
      expect(result.files["docker-compose.dev.yml"]).toContain("target: dev");
    });

    it("emits a Dockerfile for node + typescript + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "typescript",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
        runtime: "node",
      });

      expect(result.files["Dockerfile"]).toBeDefined();
      expect(result.files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
      expect(result.files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
    });

    it("emits a docker-compose.dev.yml for node + typescript + pnpm", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: "typescript",
        name: "test",
        packageManager: "pnpm",
        platformServices: ["none"],
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

const invariantCases = Object.entries(allowedCombinations).flatMap(([runtime, runtimeConfig]) =>
  runtimeConfig.frameworks.flatMap((framework) =>
    runtimeConfig.packageManagers.map((packageManager) => {
      const data = typedFrameworkLayers[`frameworks/${framework}`];
      const expectedPort = data?.port ?? 0;
      return { expectedPort, framework, packageManager, runtime };
    }),
  ),
);

describe("cross-combination consistency invariants", () => {
  const service = new LayerCompositionService();

  it.each(invariantCases)(
    "$runtime + $framework + $packageManager",
    ({ runtime, framework, packageManager, expectedPort }) => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["none"],
        framework: framework as FrameworkOption,
        name: "test",
        packageManager: packageManager as PackageManagerOption,
        platformServices: ["none"],
        runtime: runtime as RuntimeOption,
      });

      const compose = parseYaml(result.files["docker-compose.dev.yml"]!) as {
        services: { app: { build: { target: string }; ports: string[] } };
      };
      const pkg = JSON.parse(result.files["package.json"]!) as { scripts?: { dev?: string } };

      // 1. compose ports: ["<port>:<port>"]
      expect(compose.services.app.ports).toContain(`${expectedPort}:${expectedPort}`);
      // 2. compose build target = "dev" and Dockerfile contains "FROM base AS dev"
      expect(compose.services.app.build.target).toBe("dev");
      expect(result.files["Dockerfile"]).toContain("FROM base AS dev");
      // 3. scripts.dev in generated package.json contains the framework port
      expect(pkg.scripts?.dev).toContain(String(expectedPort));
    },
  );
});
