import type { CreateSelections } from "../prompt/prompt.port.js";
import { LayerCompositionService } from "./layer-composition-service.js";

describe(LayerCompositionService, () => {
  const service = new LayerCompositionService();

  const nodeExpressSelection: CreateSelections = {
    confirmed: true,
    databases: [],
    framework: "express",
    name: "test",
    packageManager: "pnpm",
    platformServices: [],
    runtime: "node",
  };

  it("emits a Dockerfile for node + express + pnpm", () => {
    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.files["Dockerfile"]).toBeDefined();
    expect(result.files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
    expect(result.files["Dockerfile"]).toContain("FROM base AS dev");
    expect(result.files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
  });

  it("emits a docker-compose.dev.yml for node + express + pnpm", () => {
    const result = service.resolveLayers(nodeExpressSelection);

    expect(result.files["docker-compose.dev.yml"]).toBeDefined();
    expect(result.files["docker-compose.dev.yml"]).toContain("3000:3000");
    expect(result.files["docker-compose.dev.yml"]).toContain("target: dev");
  });

  it("emits a Dockerfile for node + typescript + pnpm", () => {
    const result = service.resolveLayers({
      ...nodeExpressSelection,
      framework: "typescript",
    });

    expect(result.files["Dockerfile"]).toBeDefined();
    expect(result.files["Dockerfile"]).toContain("FROM node:22-alpine AS base");
    expect(result.files["Dockerfile"]).toContain('CMD ["pnpm","run","dev"]');
  });

  it("emits a docker-compose.dev.yml for node + typescript + pnpm", () => {
    const result = service.resolveLayers({
      ...nodeExpressSelection,
      framework: "typescript",
    });

    expect(result.files["docker-compose.dev.yml"]).toBeDefined();
    expect(result.files["docker-compose.dev.yml"]).toContain("3000:3000");
  });
});
