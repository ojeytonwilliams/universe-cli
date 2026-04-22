import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { LayerConflictError, MissingLayerError } from "../../../errors/cli-errors.js";
import { DATABASE_OPTIONS, RUNTIME_OPTIONS } from "../prompt/prompt.port.js";
import type { CreateSelections } from "../prompt/prompt.port.js";
import { buildComposeDevYaml } from "./build-compose-dev-yaml.js";
import { buildDockerfileData } from "./build-dockerfile-data.js";
import { alwaysLayer } from "./layers/always-layer.js";
import { baseNodeLayer } from "./layers/base-node-layer.js";
import { baseStaticLayer } from "./layers/base-static-layer.js";
import { renderDockerfile } from "./layers/dockerfile-template.js";
import type { DockerfileData } from "./layers/dockerfile-template.js";
import { frameworksLayer, typedFrameworkLayers } from "./layers/frameworks-layer.js";
import type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
} from "./layers/layer-types.js";
import {
  packageManagersLayer,
  typedPackageManagerLayers,
} from "./layers/package-managers-layer.js";
import { servicesLayer } from "./layers/services-layer.js";
import { getLabel } from "./labels.js";

type LayerType = "always" | "runtime" | "frameworks" | "package-managers" | "services";
type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;

interface LayerData {
  files: Record<string, string>;
}

type LayerEntry = LayerData & { layerType: LayerType };
type LayerRegistry = Record<string, LayerEntry | undefined>;

interface JsonObject {
  [key: string]: JsonValue;
}

interface ResolvedLayer {
  files: Record<string, string>;
  name: string;
  layerType: LayerType;
}

interface ResolvedLayerSet {
  files: Record<string, string>;
  layers: ResolvedLayer[];
}

interface FileOwner {
  layerName: string;
  layerType: LayerType;
}

interface TemplateContext {
  framework: string;
  name: string;
  port: number;
  runtime: string;
}

const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);
const NONE_VALUE = DATABASE_OPTIONS.NONE;
const NODE_RUNTIME_LAYER = "runtime/node";
const STATIC_RUNTIME_LAYER = "runtime/static";

// ServicesLayer still uses the old flat shape; shim it into LayerData here.
// Migration is deferred.
const shimmedServicesLayer: LayerRegistry = Object.fromEntries(
  Object.entries(servicesLayer).map(([key, files]) => [
    key,
    { files, layerType: "services" as LayerType },
  ]),
);

const defaultLayerRegistry: LayerRegistry = {
  always: { ...alwaysLayer, layerType: "always" },
  "runtime/node": { ...baseNodeLayer, layerType: "runtime" },
  "runtime/static": { ...baseStaticLayer, layerType: "runtime" },
  ...Object.fromEntries(
    Object.entries(frameworksLayer).map(([key, value]) => [
      key,
      value === undefined ? undefined : { ...value, layerType: "frameworks" as LayerType },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(packageManagersLayer).map(([key, value]) => [
      key,
      value === undefined ? undefined : { ...value, layerType: "package-managers" as LayerType },
    ]),
  ),
  ...shimmedServicesLayer,
};

const defaultRuntimeLayers: Record<string, RuntimeLayerData | undefined> = {
  "runtime/node": baseNodeLayer,
  "runtime/static": baseStaticLayer,
};

const defaultFrameworkLayers: Record<string, FrameworkLayerData | undefined> = typedFrameworkLayers;

const defaultPackageManagerLayers: Record<string, PackageManagerLayerData | undefined> =
  typedPackageManagerLayers;

interface LayerComposer {
  resolveLayers(input: CreateSelections): ResolvedLayerSet;
}

class LayerTemplateRenderer {
  render(template: string, context: TemplateContext): string {
    return template
      .replaceAll("{{name}}", context.name)
      .replaceAll("{{port}}", String(context.port))
      .replaceAll("{{runtime}}", context.runtime)
      .replaceAll("{{framework}}", context.framework);
  }
}

class LayerCompositionService implements LayerComposer {
  private readonly layers: LayerRegistry;
  private readonly runtimeLayers: Record<string, RuntimeLayerData | undefined>;
  private readonly frameworkLayers: Record<string, FrameworkLayerData | undefined>;
  private readonly packageManagerLayers: Record<string, PackageManagerLayerData | undefined>;

  constructor(
    layers: LayerRegistry = defaultLayerRegistry,
    runtimeLayers: Record<string, RuntimeLayerData | undefined> = defaultRuntimeLayers,
    frameworkLayers: Record<string, FrameworkLayerData | undefined> = defaultFrameworkLayers,
    packageManagerLayers: Record<
      string,
      PackageManagerLayerData | undefined
    > = defaultPackageManagerLayers,
  ) {
    this.layers = layers;
    this.runtimeLayers = runtimeLayers;
    this.frameworkLayers = frameworkLayers;
    this.packageManagerLayers = packageManagerLayers;
  }

  resolveLayers(input: CreateSelections): ResolvedLayerSet {
    const resolvedLayers = this.resolveOrderedLayers(input);
    const composedFiles: Record<string, string> = {};
    const owners = new Map<string, FileOwner>();

    for (const layer of resolvedLayers) {
      const fileEntries = Object.entries(layer.files).sort(([leftPath], [rightPath]) =>
        leftPath.localeCompare(rightPath),
      );

      for (const [filePath, content] of fileEntries) {
        const currentOwner = owners.get(filePath);

        if (currentOwner === undefined) {
          composedFiles[filePath] = content;
          owners.set(filePath, { layerName: layer.name, layerType: layer.layerType });
        } else if (currentOwner.layerType === layer.layerType) {
          throw new LayerConflictError(filePath, currentOwner.layerName, layer.name);
        } else if (this.isConfigFile(filePath)) {
          const existingContent = composedFiles[filePath];

          if (existingContent === undefined) {
            throw new MissingLayerError(filePath);
          }

          composedFiles[filePath] = this.mergeConfigFiles(filePath, existingContent, content);
          owners.set(filePath, { layerName: layer.name, layerType: layer.layerType });
        } else {
          throw new LayerConflictError(filePath, currentOwner.layerName, layer.name);
        }
      }
    }

    const renderer = new LayerTemplateRenderer();
    const frameworkData = this.frameworkLayers[this.resolveFrameworkLayer(input.framework)];

    let frameworkLabel: string = input.framework;
    let runtimeLabel: string = input.runtime;

    try {
      frameworkLabel = getLabel("framework", input.framework);
    } catch {}

    try {
      runtimeLabel = getLabel("runtime", input.runtime);
    } catch {}

    const context = {
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

    const runtimeData = this.runtimeLayers[this.resolveRuntimeLayer(input.runtime)];

    if (
      runtimeData !== undefined &&
      frameworkData !== undefined &&
      input.packageManager !== undefined
    ) {
      const pmData =
        this.packageManagerLayers[this.resolvePackageManagerLayer(input.packageManager)];

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

  private resolveOrderedLayers(input: CreateSelections): ResolvedLayer[] {
    const isNode = input.runtime === RUNTIME_OPTIONS.NODE;
    const orderedLayerNames = [
      "always",
      this.resolveRuntimeLayer(input.runtime),
      ...(isNode && input.packageManager !== undefined
        ? [this.resolvePackageManagerLayer(input.packageManager)]
        : []),
      this.resolveFrameworkLayer(input.framework),
      ...this.resolveServiceLayers(input),
    ];

    return orderedLayerNames.map((layerName) => {
      const layer = this.layers[layerName];

      if (layer === undefined) {
        throw new MissingLayerError(layerName);
      }

      return {
        files: layer.files,
        layerType: layer.layerType,
        name: layerName,
      };
    });
  }

  private resolveServiceLayers(input: CreateSelections): string[] {
    return [...input.databases, ...input.platformServices]
      .filter((value) => value !== NONE_VALUE)
      .map((value) => `services/${value}`)
      .sort((left, right) => left.localeCompare(right));
  }

  private resolveRuntimeLayer(runtime: CreateSelections["runtime"]): string {
    if (runtime === RUNTIME_OPTIONS.NODE) {
      return NODE_RUNTIME_LAYER;
    }

    return STATIC_RUNTIME_LAYER;
  }

  private resolvePackageManagerLayer(
    packageManager: NonNullable<CreateSelections["packageManager"]>,
  ): string {
    return `package-managers/${packageManager}`;
  }

  private resolveFrameworkLayer(framework: CreateSelections["framework"]): string {
    return `frameworks/${framework}`;
  }

  private isConfigFile(filePath: string): boolean {
    return [...CONFIG_EXTENSIONS].some((extension) => filePath.endsWith(extension));
  }

  private mergeConfigFiles(filePath: string, left: string, right: string): string {
    const merged = this.mergeValues(
      this.parseConfig(filePath, left),
      this.parseConfig(filePath, right),
    );

    return this.stringifyConfig(filePath, merged);
  }

  private parseConfig(filePath: string, content: string): JsonValue {
    if (filePath.endsWith(".json")) {
      return JSON.parse(content) as JsonValue;
    }

    return parseYaml(content) as JsonValue;
  }

  private stringifyConfig(filePath: string, value: JsonValue): string {
    if (filePath.endsWith(".json")) {
      return JSON.stringify(this.sortJson(value));
    }

    return stringifyYaml(value);
  }

  private mergeValues(left: JsonValue, right: JsonValue): JsonValue {
    if (this.isPlainObject(left) && this.isPlainObject(right)) {
      const merged: JsonObject = { ...left };

      for (const [key, rightValue] of Object.entries(right)) {
        const leftValue = merged[key];

        if (leftValue === undefined) {
          merged[key] = rightValue;
        } else {
          merged[key] = this.mergeValues(leftValue, rightValue);
        }
      }

      return merged;
    }

    if (Array.isArray(right)) {
      return [...right];
    }

    return right;
  }

  private isPlainObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private sortJson(value: JsonValue): JsonValue {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sortJson(entry));
    }

    if (!this.isPlainObject(value)) {
      return value;
    }

    const sortedEntries = Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, this.sortJson(entryValue)] as const);

    return Object.fromEntries(sortedEntries);
  }
}

export { defaultLayerRegistry, LayerCompositionService, LayerTemplateRenderer };
export type {
  DockerfileData,
  LayerComposer,
  LayerData,
  LayerEntry,
  LayerRegistry,
  LayerType,
  ResolvedLayer,
  ResolvedLayerSet,
  TemplateContext,
};
