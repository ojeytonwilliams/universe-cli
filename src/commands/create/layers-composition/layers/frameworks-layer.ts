import type { FrameworkLayerData } from "./layer-types.js";

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
    "@types/node": "^24",
    typescript: TYPESCRIPT_VERSION,
  },
  scripts: {
    build: "tsc -p tsconfig.json",
    start: "node dist/index.js",
  },
});

const DEV_COPY_SOURCE_TS = "COPY src/ ./src/\nCOPY tsconfig.json ./";
const TS_WATCH_SYNC = [{ path: "./src", target: "/app/src" }];

const expressFrameworkLayer: FrameworkLayerData = {
  devCopySource: DEV_COPY_SOURCE_TS,
  files: {
    "package.json": JSON.stringify({
      dependencies: {
        express: EXPRESS_VERSION,
      },
      devDependencies: {
        "@types/express": EXPRESS_VERSION,
        "@types/node": "^24",
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
  port: 3000,
  watchSync: TS_WATCH_SYNC,
};

const typescriptFrameworkLayer: FrameworkLayerData = {
  devCopySource: DEV_COPY_SOURCE_TS,
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
  port: 3000,
  watchSync: TS_WATCH_SYNC,
};

const reactViteFiles: Record<string, string> = {
  "eslint.config.js": [
    "import js from '@eslint/js'",
    "import globals from 'globals'",
    "import reactHooks from 'eslint-plugin-react-hooks'",
    "import reactRefresh from 'eslint-plugin-react-refresh'",
    "import tseslint from 'typescript-eslint'",
    "import { defineConfig, globalIgnores } from 'eslint/config'",
    "",
    "export default defineConfig([",
    "  globalIgnores(['dist']),",
    "  {",
    "    files: ['**/*.{ts,tsx}'],",
    "    extends: [",
    "      js.configs.recommended,",
    "      tseslint.configs.recommended,",
    "      reactHooks.configs.flat.recommended,",
    "      reactRefresh.configs.vite,",
    "    ],",
    "    languageOptions: {",
    "      ecmaVersion: 2020,",
    "      globals: globals.browser,",
    "    },",
    "  },",
    "])",
    "",
  ].join("\n"),
  "index.html": [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <link rel="icon" type="image/png" href="/favicon-32x32.png" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "    <title>{{name}}</title>",
    "  </head>",
    "  <body>",
    '    <div id="root"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    "  </body>",
    "</html>",
    "",
  ].join("\n"),
  "package.json": JSON.stringify({
    dependencies: {
      react: "^19",
      "react-dom": "^19",
    },
    devDependencies: {
      "@eslint/js": "^9",
      "@testing-library/react": "^16",
      "@testing-library/user-event": "^14",
      "@types/node": "^24",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      "@vitejs/plugin-react": "^6",
      eslint: "^9",
      "eslint-plugin-react-hooks": "^7",
      "eslint-plugin-react-refresh": "^0",
      globals: "^17",
      jsdom: "^26",
      typescript: "^5",
      "typescript-eslint": "^8",
      vite: "^8",
      vitest: "^3",
    },
    name: "{{name}}",
    private: true,
    scripts: {
      build: "tsc -b && vite build",
      dev: "vite",
      lint: "eslint .",
      preview: "vite preview",
      test: "vitest --run",
    },
    type: "module",
    version: "0.0.0",
  }),
  "src/App.css": "",
  "src/App.tsx": [
    "import './App.css'",
    "",
    "function App() {",
    "  return (",
    "    <h1>{{name}}</h1>",
    "  )",
    "}",
    "",
    "export default App",
    "",
  ].join("\n"),
  "src/global.css": `@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Inconsolata:wght@400;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Brand */
  --theme-color: #0a0a23;
  --yellow-gold: #ffbf00;

  /* Neutrals */
  --gray-00: #ffffff; /* primary */
  --gray-05: #f5f6f7; /* secondary */
  --gray-10: #dfdfe2; /* tertiary */
  --gray-15: #d0d0d5; /* quaternary */
  --gray-45: #858591; /* neutral */
  --gray-75: #3b3b4f; /* quaternary */
  --gray-80: #2a2a40; /* tertiary */
  --gray-85: #1b1b32; /* secondary */
  --gray-90: #0a0a23; /* primary */
  --gray-90-translucent: rgba(10, 10, 35, 0.85);

  /* Blue */
  --blue-light: rgb(153, 201, 255);
  --blue-light-translucent: rgba(153, 201, 255, 0.15);
  --blue-mid: #198eee;

  /* Yellow */
  --yellow-light: #ffc300;
  --yellow-dark: #4d3800;

  /* Green */
  --green-light: #acd157;

  /* Red */
  --red-light: #ffadad;

  /* Semantic */
  --color-bg: var(--gray-90);
  --color-surface: var(--gray-85);
  --color-surface-raised: var(--gray-80);
  --color-border: var(--gray-75);
  --color-text-primary: var(--gray-00);
  --color-text-secondary: var(--gray-15);
  --color-text-muted: var(--gray-45);
  --color-accent: var(--yellow-gold);
  --color-accent-hover: var(--yellow-light);
  --color-success: var(--green-light);
  --color-danger: var(--red-light);

  /* Typography */
  --font-body: 'Lato', sans-serif;
  --font-mono: 'Inconsolata', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --weight-normal: 400;
  --weight-bold: 700;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Borders */
  --border-default: 1px solid var(--color-border);
  --border-accent: 2px solid var(--color-accent);
  --border-focus: 2px solid var(--blue-mid);

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-accent: 0 0 12px rgba(255, 191, 0, 0.3);

  /* Transitions */
  --transition-fast: 120ms ease;
  --transition-default: 200ms ease;
  --transition-slow: 350ms ease;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-md);
  font-weight: var(--weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  -webkit-font-smoothing: antialiased;
}

.dark-palette {
  --primary-color-translucent: var(--gray-00-translucent);
  --primary-color: var(--gray-00);
  --secondary-color: var(--gray-05);
  --tertiary-color: var(--gray-10);
  --quaternary-color: var(--gray-15);
  --quaternary-background: var(--gray-75);
  --tertiary-background: var(--gray-80);
  --secondary-background: var(--gray-85);
  --primary-background: var(--gray-90);
  --primary-background-translucent: var(--gray-90-translucent);
  --highlight-color: var(--blue-light);
  --highlight-background: var(--blue-dark);
  --selection-color: var(--blue-light-translucent);
  --success-color: var(--green-light);
  --success-background: var(--green-dark);
  --danger-color: var(--red-light);
  --danger-background: var(--red-dark);
  --yellow-background: var(--yellow-dark);
  --yellow-color: var(--yellow-light);
  --purple-background: var(--purple-light);
  --purple-color: var(--purple-dark);
  --love-color: var(--love-light);
  --editor-background: var(--editor-background-dark);
}

.light-palette {
  --primary-color-translucent: var(--gray-90-translucent);
  --primary-color: var(--gray-90);
  --secondary-color: var(--gray-85);
  --tertiary-color: var(--gray-80);
  --quaternary-color: var(--gray-75);
  --quaternary-background: var(--gray-15);
  --tertiary-background: var(--gray-10);
  --secondary-background: var(--gray-05);
  --primary-background: var(--gray-00);
  --primary-background-translucent: var(--gray-00-translucent);
  --highlight-color: var(--blue-dark);
  --highlight-background: var(--blue-light);
  --selection-color: var(--blue-dark-translucent);
  --success-color: var(--green-dark);
  --success-background: var(--green-light);
  --danger-color: var(--red-dark);
  --danger-background: var(--red-light);
  --yellow-background: var(--yellow-light);
  --yellow-color: var(--yellow-dark);
  --purple-background: var(--purple-light);
  --purple-color: var(--purple-dark);
  --love-color: var(--love-dark);
  --editor-background: var(--editor-background-light);
}
`,
  "src/main.tsx": [
    "import { StrictMode } from 'react'",
    "import { createRoot } from 'react-dom/client'",
    "import './global.css'",
    "import App from './App.tsx'",
    "",
    "createRoot(document.getElementById('root')!).render(",
    "  <StrictMode>",
    "    <App />",
    "  </StrictMode>,",
    ")",
    "",
  ].join("\n"),
  "tsconfig.app.json": JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      erasableSyntaxOnly: true,
      jsx: "react-jsx",
      lib: ["ES2023", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleDetection: "force",
      moduleResolution: "bundler",
      noEmit: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedSideEffectImports: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2023",
      tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
      types: ["vite/client"],
      useDefineForClassFields: true,
      verbatimModuleSyntax: true,
    },
    include: ["src"],
  }),
  "tsconfig.json": JSON.stringify({
    files: [],
    references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
  }),
  "tsconfig.node.json": JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      erasableSyntaxOnly: true,
      lib: ["ES2023"],
      module: "ESNext",
      moduleDetection: "force",
      moduleResolution: "bundler",
      noEmit: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedSideEffectImports: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2023",
      tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
      types: ["node"],
      verbatimModuleSyntax: true,
    },
    include: ["vite.config.ts"],
  }),
  "vite.config.ts": [
    "import { defineConfig } from 'vitest/config'",
    "import react from '@vitejs/plugin-react'",
    "",
    "export default defineConfig({",
    "  // eslint-disable-next-line @typescript-eslint/ban-ts-comment",
    "  // @ts-expect-error",
    "  plugins: [react()],",
    "  test: { environment: 'jsdom', globals: true },",
    "})",
    "",
  ].join("\n"),
};

const frameworksLayer = {
  "frameworks/express": expressFrameworkLayer,
  "frameworks/none": { files: {} as Record<string, string> },
  "frameworks/react-vite": { files: reactViteFiles },
  "frameworks/typescript": typescriptFrameworkLayer,
};

const typedFrameworkLayers: Record<string, FrameworkLayerData | undefined> = {
  "frameworks/express": expressFrameworkLayer,
  "frameworks/typescript": typescriptFrameworkLayer,
};

export { frameworksLayer, typedFrameworkLayers };
