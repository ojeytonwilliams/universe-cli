import type { DockerfileData } from "./dockerfile-template.js";

interface FrameworkLayer {
  dockerfileData?: DockerfileData;
  files: Record<string, string>;
}

const EXPRESS_VERSION = "^5";
const TYPESCRIPT_VERSION = "^5";

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    module: "NodeNext",
    moduleResolution: "NodeNext",
    outDir: "dist",
    strict: true,
    target: "ES2022",
  },
  include: ["src/**/*"],
});

const TYPESCRIPT_PACKAGE_JSON_FIELDS = JSON.stringify({
  devDependencies: {
    typescript: TYPESCRIPT_VERSION,
  },
  scripts: {
    build: "tsc -p tsconfig.json",
    start: "node dist/index.js",
  },
});

const DEV_COPY_SOURCE_TS = "COPY src/ ./src/\nCOPY tsconfig.json ./";

const frameworksLayer: Record<string, FrameworkLayer> = {
  "frameworks/express": {
    dockerfileData: {
      baseImage: "node:22-alpine",
      devCopySource: DEV_COPY_SOURCE_TS,
    },
    files: {
      "package.json": JSON.stringify({
        dependencies: {
          express: EXPRESS_VERSION,
        },
        devDependencies: {
          typescript: TYPESCRIPT_VERSION,
        },
        scripts: {
          build: "tsc -p tsconfig.json",
          start: "node dist/index.js",
        },
      }),
      "src/index.ts": [
        'import express from "express";',
        "",
        "const app = express();",
        "",
        'app.get("/", (_req, res) => {',
        '  res.json({ name: "{{name}}", status: "ok" });',
        "});",
        "",
        "app.listen(3000, () => {",
        '  console.log("Universe app running on http://localhost:3000");',
        "});",
        "",
      ].join("\n"),
      "tsconfig.json": TSCONFIG,
    },
  },
  "frameworks/none": { files: {} },
  "frameworks/typescript": {
    dockerfileData: {
      baseImage: "node:22-alpine",
      devCopySource: DEV_COPY_SOURCE_TS,
    },
    files: {
      "package.json": TYPESCRIPT_PACKAGE_JSON_FIELDS,
      "src/index.ts": [
        'import { createServer } from "node:http";',
        "",
        "const server = createServer((_request, response) => {",
        '  response.writeHead(200, { "content-type": "application/json" });',
        '  response.end(JSON.stringify({ name: "{{name}}", status: "ok" }));',
        "});",
        "",
        "server.listen(3000, () => {",
        '  console.log("Universe app running on http://localhost:3000");',
        "});",
        "",
      ].join("\n"),
      "tsconfig.json": TSCONFIG,
    },
  },
};

export { frameworksLayer };
