import type { CreateSelections } from "../ports/prompt-port.js";
import { LayerConflictError, MissingLayerError } from "../errors/cli-errors.js";
import { LayerCompositionService } from "./layer-composition-service.js";

// ---------------------------------------------------------------------------
// Combination coverage helpers
// ---------------------------------------------------------------------------

const NODE_DATABASES = ["PostgreSQL", "Redis"] as const;
const NODE_SERVICES = ["Auth", "Email", "Analytics"] as const;
const NODE_FRAMEWORKS = ["Express", "None"] as const;

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

const toMultiSelect = <T extends string>(items: T[]): (T | "None")[] =>
  items.length === 0 ? ["None"] : ([...items].sort() as (T | "None")[]);

const expectedNodeLayerNames = (
  framework: (typeof NODE_FRAMEWORKS)[number],
  databases: CreateSelections["databases"],
  platformServices: CreateSelections["platformServices"],
): string[] => {
  const frameworkLayer = framework === "Express" ? "frameworks/express" : "frameworks/none";
  const serviceLayerSlugs = [
    ...databases.filter((d) => d !== "None"),
    ...platformServices.filter((s) => s !== "None"),
  ]
    .map((v) => `services/${v.toLowerCase()}`)
    .sort((a, b) => a.localeCompare(b));

  return ["always", "base/node-js-typescript", frameworkLayer, ...serviceLayerSlugs];
};

interface NodeCase {
  databases: CreateSelections["databases"];
  databaseLabel: string;
  framework: (typeof NODE_FRAMEWORKS)[number];
  platformServices: CreateSelections["platformServices"];
  serviceLabel: string;
}

const databaseSubsets = buildPowerSet(NODE_DATABASES).map((s) => toMultiSelect([...s]));
const serviceSubsets = buildPowerSet(NODE_SERVICES).map((s) => toMultiSelect([...s]));

const nodeCombinations: NodeCase[] = NODE_FRAMEWORKS.flatMap((framework) =>
  databaseSubsets.flatMap((databases) =>
    serviceSubsets.map((platformServices) => ({
      databaseLabel: databases.join(","),
      databases: databases as CreateSelections["databases"],
      framework,
      platformServices: platformServices as CreateSelections["platformServices"],
      serviceLabel: platformServices.join(","),
    })),
  ),
);

const nodeExpressSelection: CreateSelections = {
  confirmed: true,
  databases: ["Redis", "PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Email", "Auth"],
  runtime: "Node.js (TypeScript)",
};

const createService = (overrides?: Record<string, Record<string, string>>) =>
  new LayerCompositionService({
    always: {
      ".gitignore": "dist\nnode_modules\n",
      "README.md": "# Hello Universe\n",
    },
    "base/node-js-typescript": {
      "package.json": '{"scripts":{"build":"tsc","dev":"node src/index.js"}}',
      "src/index.ts": "export { start } from './server.js';\n",
    },
    "frameworks/express": {
      "package.json":
        '{"dependencies":{"express":"1.2.3"},"scripts":{"dev":"node --watch src/index.js"}}',
      "src/server.ts": "const start = (): void => {};\nexport { start };\n",
    },
    "services/auth": {
      "config/services/auth.json": '{"service":"auth"}',
    },
    "services/email": {
      "config/services/email.json": '{"service":"email"}',
    },
    "services/postgresql": {
      "config/resources/postgresql.json": '{"resource":"postgresql"}',
    },
    "services/redis": {
      "config/resources/redis.json": '{"resource":"redis"}',
    },
    ...overrides,
  });

describe(LayerCompositionService, () => {
  it("resolves layers in deterministic stage and sorted service order", () => {
    const service = createService();

    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.layers.map((layer) => layer.name)).toStrictEqual([
      "always",
      "base/node-js-typescript",
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
      databases: ["PostgreSQL", "Redis"],
      platformServices: ["Auth", "Email"],
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
      "frameworks/express": undefined as unknown as Record<string, string>,
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(MissingLayerError);
  });

  it("fails with a typed error for non-configuration file collisions across stages", () => {
    const service = createService({
      "base/node-js-typescript": {
        "README.md": "# Replacement\n",
      },
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  it("fails with a typed error for same-stage collisions", () => {
    const service = createService({
      "services/auth": {
        "config/services/shared.json": '{"service":"auth"}',
      },
      "services/email": {
        "config/services/shared.json": '{"service":"email"}',
      },
    });

    const act = () => service.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  describe("template rendering", () => {
    it("substitutes {{name}} in file content using the selection name", () => {
      const service = new LayerCompositionService({
        always: { "README.md": "# {{name}}\n" },
        "base/node-js-typescript": {},
        "frameworks/none": {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "None",
        name: "my-app",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      expect(result.files["README.md"]).toBe("# my-app\n");
    });

    it("substitutes {{runtime}} and {{framework}} in file content", () => {
      const service = new LayerCompositionService({
        always: { "meta.txt": "rt={{runtime}} fw={{framework}}\n" },
        "base/node-js-typescript": {},
        "frameworks/express": {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "Express",
        name: "app",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      expect(result.files["meta.txt"]).toBe("rt=Node.js (TypeScript) fw=Express\n");
    });

    it("leaves unknown placeholders in file content unchanged", () => {
      const service = new LayerCompositionService({
        always: { "note.txt": "{{name}} {{unknown}}\n" },
        "base/node-js-typescript": {},
        "frameworks/none": {},
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "None",
        name: "my-app",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      expect(result.files["note.txt"]).toBe("my-app {{unknown}}\n");
    });
  });

  describe("yaml config serialisation", () => {
    const makeYamlService = (overrides?: Record<string, Record<string, string>>) =>
      new LayerCompositionService({
        always: { "README.md": "# test\n" },
        "base/node-js-typescript": { "package.json": '{"name":"test"}' },
        "base/static": { "public/index.html": "<h1>test</h1>\n" },
        "frameworks/express": {},
        "frameworks/none": {},
        ...overrides,
      });

    it("merges YAML config files and emits valid YAML output", () => {
      const service = makeYamlService({
        "base/node-js-typescript": {
          "docker-compose.yaml": "version: '3'\nservices:\n  app:\n    image: node:22\n",
        },
        "frameworks/express": {
          "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n",
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "Express",
        name: "test",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      const output = result.files["docker-compose.yaml"];

      expect(output).toBeDefined();
      expect(output).toContain("image: node:22");
      expect(output).toContain("3000:3000");
      expect(output).not.toContain("{");
    });

    it("merges .yml config files and emits valid YAML output", () => {
      const service = makeYamlService({
        "base/node-js-typescript": { "config.yml": "env: base\nshared: common\n" },
        "frameworks/express": { "config.yml": "env: extended\n" },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "Express",
        name: "test",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      const output = result.files["config.yml"];

      expect(output).toContain("env: extended");
      expect(output).toContain("shared: common");
      expect(output).not.toContain("{");
    });

    it("preserves JSON round-trip behavior unchanged", () => {
      const service = makeYamlService({
        "base/node-js-typescript": { "package.json": '{"scripts":{"build":"tsc"}}' },
        "frameworks/express": { "package.json": '{"dependencies":{"express":"5.1.0"}}' },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "Express",
        name: "test",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
      });

      expect(result.files["package.json"]).toBe(
        '{"dependencies":{"express":"5.1.0"},"scripts":{"build":"tsc"}}',
      );
    });

    it("resolves layers containing both JSON and YAML config files", () => {
      const service = makeYamlService({
        "base/node-js-typescript": {
          "docker-compose.yaml": "services:\n  app:\n    image: node:22\n",
          "package.json": '{"scripts":{"build":"tsc"}}',
        },
        "frameworks/express": {
          "docker-compose.yaml": "services:\n  app:\n    ports:\n      - '3000:3000'\n",
          "package.json": '{"dependencies":{"express":"5.1.0"}}',
        },
      });

      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "Express",
        name: "test",
        platformServices: ["None"],
        runtime: "Node.js (TypeScript)",
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

    it("resolves Static to always, base/static, and frameworks/none", () => {
      const result = service.resolveLayers({
        confirmed: true,
        databases: ["None"],
        framework: "None",
        name: "test",
        platformServices: ["None"],
        runtime: "Static (HTML/CSS/JS)",
      });

      expect(result.layers.map((layer) => layer.name)).toStrictEqual([
        "always",
        "base/static",
        "frameworks/none",
      ]);
    });

    it.each(nodeCombinations)(
      "resolves Node.js + $framework + db:[$databaseLabel] + svc:[$serviceLabel]",
      ({ framework, databases, platformServices }) => {
        const result = service.resolveLayers({
          confirmed: true,
          databases,
          framework,
          name: "test",
          platformServices,
          runtime: "Node.js (TypeScript)",
        });

        expect(result.layers.map((layer) => layer.name)).toStrictEqual(
          expectedNodeLayerNames(framework, databases, platformServices),
        );
      },
    );
  });
});
