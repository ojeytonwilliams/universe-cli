import { MissingLayerError } from "../../../errors/cli-errors.js";
import type { CreateSelections } from "../prompt/prompt.port.js";
import type {
  FrameworkLayerData,
  PackageManagerLayerData,
  RuntimeLayerData,
} from "./layers/layer-types.js";

type LayerType = "always" | "frameworks" | "package-managers" | "runtime" | "services";

interface LayerData {
  files: Record<string, string>;
}

interface LayerRegistry {
  always: Record<string, LayerData>;
  frameworks: Record<string, FrameworkLayerData | undefined>;
  "package-managers": Record<string, PackageManagerLayerData | undefined>;
  runtime: Record<string, RuntimeLayerData>;
  services: Record<string, LayerData | undefined>;
}

interface ResolvedLayer {
  files: Record<string, string>;
  layerType: LayerType;
  name: string;
}

const resolveOrderedLayers = (input: CreateSelections, layers: LayerRegistry): ResolvedLayer[] => {
  const isNode = input.runtime === "node";
  const runtimeId = isNode ? "node" : "static_web";

  const refs: { id: string; layerType: LayerType }[] = [
    { id: "always", layerType: "always" },
    { id: runtimeId, layerType: "runtime" },
    ...(isNode && input.packageManager !== undefined
      ? [{ id: input.packageManager, layerType: "package-managers" as const }]
      : []),
    { id: input.framework, layerType: "frameworks" },
    ...[...input.databases, ...input.platformServices]
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, layerType: "services" as const })),
  ];

  return refs.map(({ id, layerType }) => {
    const layer = layers[layerType]?.[id];
    const name = layerType === "always" ? id : `${layerType}/${id}`;

    if (layer === undefined) {
      throw new MissingLayerError(name);
    }

    return { files: layer.files, layerType, name };
  });
};

export { resolveOrderedLayers };
export type { LayerData, LayerRegistry, LayerType, ResolvedLayer };
