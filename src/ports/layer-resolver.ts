import type { CreateSelections } from "./prompt-port.js";

interface ResolvedLayer {
  files: Record<string, string>;
  name: string;
  stage: "always" | "base" | "frameworks" | "services";
}

interface ResolvedLayerSet {
  files: Record<string, string>;
  layers: ResolvedLayer[];
}

interface LayerResolver {
  resolveLayers(input: CreateSelections): ResolvedLayerSet;
}

export type { LayerResolver, ResolvedLayer, ResolvedLayerSet };
