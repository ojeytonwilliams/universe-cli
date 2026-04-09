import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { LayerConflictError, MissingLayerError } from "../errors/cli-errors.js";
import {
  DATABASE_OPTIONS,
  FRAMEWORK_LABELS,
  FRAMEWORK_OPTIONS,
  RUNTIME_LABELS,
  RUNTIME_OPTIONS,
} from "../ports/prompt-port.js";
import type { CreateSelections } from "../ports/prompt-port.js";
import { defaultLayerRegistry } from "./default-layer-registry.js";
import type { LayerRegistry } from "./default-layer-registry.js";
import { LayerTemplateRenderer } from "./layer-template-renderer.js";

type LayerStage = "always" | "base" | "frameworks" | "services";
type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;

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

const CONFIG_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);
const NONE_VALUE = DATABASE_OPTIONS.NONE;
const NODE_RUNTIME_LAYER = "base/node-js-typescript";
const STATIC_RUNTIME_LAYER = "base/static";

class LayerCompositionService {
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
    const orderedLayerNames = [
      "always",
      this.resolveRuntimeLayer(input.runtime),
      this.resolveFrameworkLayer(input.framework),
      ...this.resolveServiceLayers(input),
    ];

    return orderedLayerNames.map((layerName) => {
      const layer = this.layers[layerName];

      if (layer === undefined) {
        throw new MissingLayerError(layerName);
      }

      return {
        files: layer,
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
    if (runtime === RUNTIME_OPTIONS.NODE_TS) {
      return NODE_RUNTIME_LAYER;
    }

    return STATIC_RUNTIME_LAYER;
  }

  private resolveFrameworkLayer(framework: CreateSelections["framework"]): string {
    if (framework === FRAMEWORK_OPTIONS.EXPRESS) {
      return "frameworks/express";
    }

    return "frameworks/none";
  }

  private resolveStage(layerName: string): LayerStage {
    if (layerName === "always") {
      return "always";
    }

    if (layerName.startsWith("base/")) {
      return "base";
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

export { defaultLayerRegistry, LayerCompositionService };
export type { LayerRegistry, ResolvedLayer, ResolvedLayerSet };
