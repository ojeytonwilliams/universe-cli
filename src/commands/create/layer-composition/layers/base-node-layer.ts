import type { RuntimeLayerData } from "./layer-types.js";

const baseNodeLayer: RuntimeLayerData = {
  baseImage: "node:22-alpine",
  files: {
    Procfile: "web: node dist/index.js\n",
    "package.json": JSON.stringify({
      name: "{{name}}",
      private: true,
      type: "module",
    }),
  },
};

export { baseNodeLayer };
