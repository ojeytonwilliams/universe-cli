import { alwaysLayer } from "./layers/always-layer.js";
import { baseNodeJsTypescriptLayer } from "./layers/base-node-js-typescript-layer.js";
import { baseStaticLayer } from "./layers/base-static-layer.js";
import { frameworksLayer } from "./layers/frameworks-layer.js";
import { servicesLayer } from "./layers/services-layer.js";

type LayerRegistry = Record<string, Record<string, string> | undefined>;

const defaultLayerRegistry: LayerRegistry = {
  always: alwaysLayer,
  "base/node-js-typescript": baseNodeJsTypescriptLayer,
  "base/static": baseStaticLayer,
  ...frameworksLayer,
  ...servicesLayer,
};

export { defaultLayerRegistry };
export type { LayerRegistry };
