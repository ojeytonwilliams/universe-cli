const baseNodeLayer = {
  Procfile: "web: node dist/index.js\n",
  "docker-compose.dev.yml": [
    "services:",
    "  app:",
    "    image: node:22-alpine",
    "    working_dir: /app",
    "    volumes:",
    "      - ./:/app",
    "    command: sh start.sh",
    "    ports:",
    '      - "3000:3000"',
    "",
  ].join("\n"),
  "package.json": JSON.stringify({
    name: "{{name}}",
    private: true,
    type: "module",
  }),
};

export { baseNodeLayer };
