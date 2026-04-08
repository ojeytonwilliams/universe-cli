import type { CreateSelections } from "../ports/prompt-port.js";
import { LayerConflictError, MissingLayerError } from "../errors/cli-errors.js";
import { LocalLayerResolver } from "./local-layer-resolver.js";

const nodeExpressSelection: CreateSelections = {
  confirmed: true,
  databases: ["Redis", "PostgreSQL"],
  framework: "Express",
  name: "hello-universe",
  platformServices: ["Email", "Auth"],
  runtime: "Node.js (TypeScript)",
};

const createResolver = (overrides?: Record<string, Record<string, string>>) =>
  new LocalLayerResolver({
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

describe(LocalLayerResolver, () => {
  it("resolves layers in deterministic stage and sorted service order", () => {
    const resolver = createResolver();

    const result = resolver.resolveLayers(nodeExpressSelection);

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
    const resolver = createResolver();

    const firstResult = resolver.resolveLayers(nodeExpressSelection);
    const secondResult = resolver.resolveLayers({
      ...nodeExpressSelection,
      databases: ["PostgreSQL", "Redis"],
      platformServices: ["Auth", "Email"],
    });

    expect(secondResult).toStrictEqual(firstResult);
  });

  it("merges configuration files and lets later layers overwrite direct key conflicts", () => {
    const resolver = createResolver();

    const result = resolver.resolveLayers(nodeExpressSelection);

    expect(result.files["package.json"]).toBe(
      '{"dependencies":{"express":"1.2.3"},"scripts":{"build":"tsc","dev":"node --watch src/index.js"}}',
    );
  });

  it("fails with a typed error when a required layer is missing", () => {
    const resolver = createResolver({
      "frameworks/express": undefined as unknown as Record<string, string>,
    });

    const act = () => resolver.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(MissingLayerError);
  });

  it("fails with a typed error for non-configuration file collisions across stages", () => {
    const resolver = createResolver({
      "base/node-js-typescript": {
        "README.md": "# Replacement\n",
      },
    });

    const act = () => resolver.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });

  it("fails with a typed error for same-stage collisions", () => {
    const resolver = createResolver({
      "services/auth": {
        "config/services/shared.json": '{"service":"auth"}',
      },
      "services/email": {
        "config/services/shared.json": '{"service":"email"}',
      },
    });

    const act = () => resolver.resolveLayers(nodeExpressSelection);

    expect(act).toThrow(LayerConflictError);
  });
});
