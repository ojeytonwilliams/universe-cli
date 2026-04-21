import { buildDockerfileData } from "./build-dockerfile-data.js";
import type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
} from "./layers/layer-types.js";

const runtime: RuntimeLayerData = {
  baseImage: "node:22-alpine",
  files: {},
};

const framework: FrameworkLayerData = {
  devCopySource: "COPY src/ ./src/\nCOPY tsconfig.json ./",
  files: {},
  port: 3000,
  watchSync: [],
};

const packageManager: PackageManagerLayerData = {
  devCmd: ["pnpm", "run", "dev"],
  devInstall: "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
  files: {},
  watchRebuild: [],
};

describe(buildDockerfileData, () => {
  it("maps baseImage from runtime.baseImage", () => {
    const result = buildDockerfileData(runtime, framework, packageManager);
    expect(result.baseImage).toBe("node:22-alpine");
  });

  it("maps devCopySource from framework.devCopySource", () => {
    const result = buildDockerfileData(runtime, framework, packageManager);
    expect(result.devCopySource).toBe("COPY src/ ./src/\nCOPY tsconfig.json ./");
  });

  it("maps devInstall from packageManager.devInstall", () => {
    const result = buildDockerfileData(runtime, framework, packageManager);
    expect(result.devInstall).toBe(
      "COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install",
    );
  });

  it("maps devCmd from packageManager.devCmd", () => {
    const result = buildDockerfileData(runtime, framework, packageManager);
    expect(result.devCmd).toStrictEqual(["pnpm", "run", "dev"]);
  });
});
