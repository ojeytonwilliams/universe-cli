import { DEPENDENCY_VERSIONS } from "./dependency-versions.js";

const baseNodeJsTypescriptLayer = {
  Procfile: "web: node dist/index.js\n",
  "docker-compose.dev.yml": [
    "services:",
    "  app:",
    "    image: node:22-alpine",
    "    working_dir: /app",
    "    volumes:",
    "      - ./:/app",
    '    command: sh -c "pnpm install && pnpm dev"',
    "    ports:",
    '      - "3000:3000"',
    "",
  ].join("\n"),
  "package.json": JSON.stringify({
    devDependencies: {
      typescript: DEPENDENCY_VERSIONS.typescript,
    },
    name: "{{name}}",
    private: true,
    scripts: {
      build: "tsc -p tsconfig.json",
      dev: "npm run build && npm run start",
      start: "node dist/index.js",
    },
    type: "module",
  }),
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
  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      outDir: "dist",
      strict: true,
      target: "ES2022",
    },
    include: ["src/**/*"],
  }),
};

export { baseNodeJsTypescriptLayer };
