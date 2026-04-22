import { stringify as stringifyYaml } from "yaml";
import type { FrameworkLayerData, PackageManagerLayerData } from "./schemas/layers.js";

const buildComposeDevYaml = (
  framework: FrameworkLayerData,
  packageManager: PackageManagerLayerData,
): string => {
  const { port } = framework;
  const portMapping = `${port}:${port}`;

  const syncEntries = framework.watchSync.map((entry) => ({
    action: "sync" as const,
    path: entry.path,
    target: entry.target,
  }));

  const rebuildEntries = packageManager.watchRebuild.map((entry) => ({
    action: "rebuild" as const,
    path: entry.path,
  }));

  const compose = {
    services: {
      app: {
        build: {
          context: "./",
          target: "dev",
        },
        develop: {
          watch: [...syncEntries, ...rebuildEntries],
        },
        ports: [portMapping],
      },
    },
  };

  return stringifyYaml(compose);
};

export { buildComposeDevYaml };
