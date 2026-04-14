const TYPESCRIPT_VERSION = "^5";

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
      typescript: TYPESCRIPT_VERSION,
    },
    name: "{{name}}",
    private: true,
    scripts: {
      build: "tsc -p tsconfig.json",
      dev: "pnpm run build && pnpm run start",
      preinstall: "npx only-allow pnpm",
      start: "node dist/index.js",
    },
    type: "module",
  }),
  "pnpm-workspace.yaml": [
    "blockExoticSubdeps: true",
    "minimumReleaseAge: 1440",
    "trustPolicy: no-downgrade",
    "engineStrict: true",
    "",
  ].join("\n"),
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
