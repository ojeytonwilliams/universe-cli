import type { RuntimeLayerData } from "./layer-types.js";

const baseStaticLayer: RuntimeLayerData = {
  baseImage: "node:22-alpine",
  files: {
    ".dockerignore": [".git", ""].join("\n"),
    Procfile: "web: npx serve public -l {{port}}\n",
    "pnpm-workspace.yaml": "",
  },
};

export { baseStaticLayer };
