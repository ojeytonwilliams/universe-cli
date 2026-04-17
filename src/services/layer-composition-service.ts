import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { LayerConflictError, MissingLayerError } from "../errors/cli-errors.js";
import {
  DATABASE_OPTIONS,
  FRAMEWORK_LABELS,
  RUNTIME_LABELS,
  RUNTIME_OPTIONS,
} from "../prompt/prompt.port.js";
import type { CreateSelections } from "../prompt/prompt.port.js";
import { alwaysLayer } from "./layers/always-layer.js";
import { baseNodeLayer } from "./layers/base-node-layer.js";
import { baseStaticLayer } from "./layers/base-static-layer.js";
import { frameworksLayer } from "./layers/frameworks-layer.js";
import { packageManagersLayer } from "./layers/package-managers-layer.js";
import { servicesLayer } from "./layers/services-layer.js";

type LayerStage = "always" | "base" | "frameworks" | "package-managers" | "services";
type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;

interface DockerfileData {
  baseImage?: string;
  devCmd?: string[];
  devCopySource?: string;
  devInstall?: string;
}

interface LayerData {
  dockerfileData?: DockerfileData;
  files: Record<string, string>;
}

type LayerRegistry = Record<string, LayerData | undefined>;

interface JsonObject {
  [key: string]: JsonValue;
}

interface ResolvedLayer {
  files: Record<string, string>;
  name: string;
  stage: LayerStage;
}

interface ResolvedLayerSet {
  files: Record<string, string>;
  layers: ResolvedLayer[];
}

interface FileOwner {
  layerName: string;
  stage: LayerStage;
}

interface TemplateContext {
  framework: string;
  name: string;
  runtime: string;
}

const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);
const NONE_VALUE = DATABASE_OPTIONS.NONE;
const NODE_RUNTIME_LAYER = "base/node";
const STATIC_RUNTIME_LAYER = "base/static";

// ServicesLayer still uses the old flat shape; shim it into LayerData here.
// Migration is deferred.
const shimmedServicesLayer: LayerRegistry = Object.fromEntries(
  Object.entries(servicesLayer).map(([key, files]) => [key, { files }]),
);

const defaultLayerRegistry: LayerRegistry = {
  always: alwaysLayer,
  "base/node": baseNodeLayer,
  "base/static": baseStaticLayer,
  ...frameworksLayer,
  ...packageManagersLayer,
  ...shimmedServicesLayer,
};

interface LayerComposer {
  resolveLayers(input: CreateSelections): ResolvedLayerSet;
}

class LayerTemplateRenderer {
  render(template: string, context: TemplateContext): string {
    return template
      .replaceAll("{{name}}", context.name)
      .replaceAll("{{runtime}}", context.runtime)
      .replaceAll("{{framework}}", context.framework);
  }
}

class LayerCompositionService implements LayerComposer {
  private readonly layers: LayerRegistry;

  constructor(layers: LayerRegistry = defaultLayerRegistry) {
    this.layers = layers;
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
          owners.set(filePath, { layerName: layer.name, stage: layer.stage });
        } else if (currentOwner.stage === layer.stage) {
          throw new LayerConflictError(filePath, currentOwner.layerName, layer.name);
        } else if (this.isConfigFile(filePath)) {
          const existingContent = composedFiles[filePath];

          if (existingContent === undefined) {
            throw new MissingLayerError(filePath);
          }

          composedFiles[filePath] = this.mergeConfigFiles(filePath, existingContent, content);
          owners.set(filePath, { layerName: layer.name, stage: layer.stage });
        } else {
          throw new LayerConflictError(filePath, currentOwner.layerName, layer.name);
        }
      }
    }

    const renderer = new LayerTemplateRenderer();
    const context = {
      framework: FRAMEWORK_LABELS[input.framework],
      name: input.name,
      runtime: RUNTIME_LABELS[input.runtime],
    };
    const renderedFiles = Object.fromEntries(
      Object.entries(composedFiles).map(([filePath, content]) => [
        filePath,
        renderer.render(content, context),
      ]),
    );

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
        name: layerName,
        stage: this.resolveStage(layerName),
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

  private resolveStage(layerName: string): LayerStage {
    if (layerName === "always") {
      return "always";
    }

    if (layerName.startsWith("base/")) {
      return "base";
    }

    if (layerName.startsWith("package-managers/")) {
      return "package-managers";
    }

    if (layerName.startsWith("frameworks/")) {
      return "frameworks";
    }

    return "services";
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
  LayerRegistry,
  ResolvedLayer,
  ResolvedLayerSet,
  TemplateContext,
};
