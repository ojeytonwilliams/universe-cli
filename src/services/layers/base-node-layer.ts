const baseNodeLayer = {
  files: {
    Procfile: "web: node dist/index.js\n",
    "docker-compose.dev.yml": ["services:", "  app:", "    ports:", '      - "3000:3000"', ""].join(
      "\n",
    ),
    "package.json": JSON.stringify({
      name: "{{name}}",
      private: true,
      type: "module",
    }),
  },
};

export { baseNodeLayer };
