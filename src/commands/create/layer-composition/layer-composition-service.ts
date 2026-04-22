import type { CreateSelections } from "../prompt/prompt.port.js";
import { buildComposeDevYaml } from "./build-compose-dev-yaml.js";
import { composeLayerFiles } from "./compose-layer-files.js";
import { servicesLayer } from "./layers/services-layer.js";
import { LayerTemplateRenderer } from "./layer-template-renderer.js";
import type { TemplateContext } from "./layer-template-renderer.js";
import { getLabel } from "./labels.js";
import { resolveOrderedLayers } from "./resolve-ordered-layers.js";
import type {
  LayerData,
  LayerRegistry,
  LayerType,
  ResolvedLayer,
} from "./resolve-ordered-layers.js";

import alwaysLayer from "./layers/always.json" with { type: "json" };
import frameworksLayer from "./layers/framework.json" with { type: "json" };
import packageManagersLayer from "./layers/package-manager.json" with { type: "json" };
import runtimeLayer from "./layers/runtime.json" with { type: "json" };
import type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
} from "./layers/layer-types.js";

interface ResolvedLayerSet {
  files: Record<string, string>;
  layers: ResolvedLayer[];
}

interface LayerComposer {
  resolveLayers(input: CreateSelections): ResolvedLayerSet;
}

interface DockerfileData {
  baseImage?: string;
  devCmd?: string[];
  devCopySource?: string;
  devInstall?: string;
}

const buildDockerfileData = (
  runtime: RuntimeLayerData,
  framework: FrameworkLayerData,
  packageManager: PackageManagerLayerData,
): Required<DockerfileData> => ({
  baseImage: runtime.baseImage,
  devCmd: packageManager.devCmd,
  devCopySource: framework.devCopySource,
  devInstall: packageManager.devInstall,
});

const renderDockerfile = (data: Required<DockerfileData>): string =>
  `FROM ${data.baseImage} AS base\n` +
  `WORKDIR /app\n` +
  `\n` +
  `FROM base AS dev\n` +
  `${data.devInstall}\n` +
  `${data.devCopySource}\n` +
  `CMD ${JSON.stringify(data.devCmd)}\n`;

const defaultLayerRegistry: LayerRegistry = {
  always: { always: alwaysLayer },
  frameworks: frameworksLayer,
  "package-managers": packageManagersLayer,
  runtime: runtimeLayer,
  services: Object.fromEntries(
    Object.entries(servicesLayer).map(([key, files]) => [key.slice("services/".length), { files }]),
  ),
};

class LayerCompositionService implements LayerComposer {
  private readonly layers: LayerRegistry;

  constructor(layers: LayerRegistry = defaultLayerRegistry) {
    this.layers = layers;
  }

  resolveLayers(input: CreateSelections): ResolvedLayerSet {
    const resolvedLayers = resolveOrderedLayers(input, this.layers);

    const pmPreinstall =
      input.packageManager === undefined
        ? undefined
        : this.layers["package-managers"][input.packageManager]?.preinstall;

    const composedFiles = composeLayerFiles(resolvedLayers, pmPreinstall);

    const renderer = new LayerTemplateRenderer();
    const frameworkData = this.layers.frameworks?.[input.framework];

    let frameworkLabel: string = input.framework;
    let runtimeLabel: string = input.runtime;

    try {
      frameworkLabel = getLabel("framework", input.framework);
    } catch {}

    try {
      runtimeLabel = getLabel("runtime", input.runtime);
    } catch {}

    const context: TemplateContext = {
      framework: frameworkLabel,
      name: input.name,
      port: frameworkData?.port ?? 0,
      runtime: runtimeLabel,
    };

    const renderedFiles: Record<string, string> = Object.fromEntries(
      Object.entries(composedFiles).map(([filePath, content]) => [
        filePath,
        renderer.render(content, context),
      ]),
    );

    const runtimeData = this.layers.runtime?.[input.runtime];

    if (
      runtimeData !== undefined &&
      frameworkData !== undefined &&
      input.packageManager !== undefined
    ) {
      const pmData = this.layers["package-managers"][input.packageManager];

      if (pmData !== undefined) {
        renderedFiles["Dockerfile"] = renderDockerfile(
          buildDockerfileData(runtimeData, frameworkData, pmData),
        );
        renderedFiles["docker-compose.dev.yml"] = buildComposeDevYaml(frameworkData, pmData);
      }
    }

    return {
      files: renderedFiles,
      layers: resolvedLayers,
    };
  }
}

export { defaultLayerRegistry, LayerCompositionService };
export type {
  DockerfileData,
  LayerComposer,
  LayerData,
  LayerRegistry,
  LayerType,
  ResolvedLayer,
  ResolvedLayerSet,
  TemplateContext,
};
