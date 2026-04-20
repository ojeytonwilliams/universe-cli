# TODO

## Phase 1: Layer type interfaces and pure assembly functions

- [ ] TASK: Define typed layer data interfaces
  - Create `src/commands/create/layers-composition/layers/layer-types.ts` exporting `RuntimeLayerData`, `FrameworkLayerData`, `PackageManagerLayerData`, `WatchSyncEntry`, `WatchRebuildEntry` as specified in REQ-1
  - `RuntimeLayerData` has `baseImage: string` and `files: Record<string, string>`
  - `FrameworkLayerData` has `devCopySource: string`, `port: number`, `watchSync: WatchSyncEntry[]`, `files: Record<string, string>`
  - `PackageManagerLayerData` has `devInstall: string`, `devCmd: string[]`, `watchRebuild: WatchRebuildEntry[]`, `files: Record<string, string>`
  - `WatchSyncEntry` has `path: string` and `target: string`; `WatchRebuildEntry` has `path: string`
  - `pnpm check` passes

- [ ] CODE: `buildDockerfileData` assembly function
  - Feature: Pure function that assembles `Required<DockerfileData>` from typed layer inputs, replacing the `mergeDockerfileData` + `isCompleteDockerfileData` pattern per REQ-2
  - Files: `src/commands/create/layers-composition/build-dockerfile-data.ts`
  - Acceptance:
    - Signature: `buildDockerfileData(runtime: RuntimeLayerData, framework: FrameworkLayerData, packageManager: PackageManagerLayerData): Required<DockerfileData>`
    - `baseImage` ← `runtime.baseImage`
    - `devCopySource` ← `framework.devCopySource`
    - `devInstall` ← `packageManager.devInstall`
    - `devCmd` ← `packageManager.devCmd`
    - Return type is `Required<DockerfileData>` — TypeScript guarantees all four slots are present with no runtime guard
    - `pnpm test` passes

- [ ] CODE: `buildComposeDevYaml` assembly function
  - Feature: Pure function that generates a complete `docker-compose.dev.yml` YAML string from typed layer data, replacing YAML deep-merge per REQ-3
  - Files: `src/commands/create/layers-composition/build-compose-dev-yaml.ts`
  - Acceptance:
    - Signature: `buildComposeDevYaml(framework: FrameworkLayerData, packageManager: PackageManagerLayerData): string`
    - Generated YAML has `services.app.build.context: "./"` and `services.app.build.target: "dev"`
    - `services.app.ports` is `["<port>:<port>"]` where `<port>` equals `framework.port`
    - `services.app.develop.watch` contains one `action: sync` entry per entry in `framework.watchSync`, with matching `path` and `target`
    - `services.app.develop.watch` contains one `action: rebuild` entry per entry in `packageManager.watchRebuild`, with matching `path`
    - `pnpm test` passes

## Phase 2: Wire node layers to new shapes and update composition service

- [ ] CODE: Wire `base-node-layer` to `RuntimeLayerData`
  - Feature: `base-node-layer` conforms to `RuntimeLayerData` per REQ-10
  - Files: `src/commands/create/layers-composition/layers/base-node-layer.ts`
  - Acceptance:
    - `baseNodeLayer` is typed as `RuntimeLayerData`
    - `baseImage` is `"node:22-alpine"`
    - `docker-compose.dev.yml` absent from `files`
    - `pnpm test` passes

- [ ] CODE: Wire `frameworks/express` and `frameworks/typescript` to `FrameworkLayerData`
  - Feature: Both node framework entries gain `port`, `devCopySource`, `watchSync` and lose `dockerfileData` per REQ-9
  - Files: `src/commands/create/layers-composition/layers/frameworks-layer.ts`
  - Acceptance:
    - `frameworks/express`: `port: 3000`, `devCopySource: "COPY src/ ./src/\nCOPY tsconfig.json ./"`, `watchSync: [{ path: "./src", target: "/app/src" }]`
    - `frameworks/typescript`: same `port`, `devCopySource`, and `watchSync` as express
    - `dockerfileData` absent from both entries
    - `pnpm test` passes

- [ ] CODE: Wire `package-managers/pnpm` to `PackageManagerLayerData`
  - Feature: `package-managers/pnpm` gains `devInstall`, `devCmd`, `watchRebuild` and loses `dockerfileData`; `docker-compose.dev.yml` removed from its `files` per REQ-8 (pnpm portion)
  - Files: `src/commands/create/layers-composition/layers/package-managers-layer.ts`
  - Acceptance:
    - `devInstall` is `"COPY package.json pnpm-lock.yaml ./\nRUN corepack enable pnpm && pnpm install"`
    - `devCmd` is `["pnpm", "run", "dev"]`
    - `watchRebuild` is `[{ path: "./package.json" }, { path: "./pnpm-lock.yaml" }]`
    - `docker-compose.dev.yml` absent from `files`
    - `pnpm test` passes

- [ ] CODE: Update composition service to use assembly functions
  - Feature: Replace `mergeDockerfileData` + `isCompleteDockerfileData` with `buildDockerfileData`; replace YAML deep-merge of compose layer files with `buildComposeDevYaml` per REQ-2, REQ-3
  - Files: `src/commands/create/layers-composition/layer-composition-service.ts`
  - Acceptance:
    - `mergeDockerfileData` and `isCompleteDockerfileData` methods removed
    - `buildDockerfileData` called with the resolved runtime, framework, and package manager typed layer objects
    - `buildComposeDevYaml` called to produce `docker-compose.dev.yml` in the output file set
    - YAML deep-merge logic for compose files removed from the service
    - `frameworks/express + pnpm` and `frameworks/typescript + pnpm` combinations produce a valid `Dockerfile` and `docker-compose.dev.yml`
    - `pnpm test` passes

- [ ] TASK: Remove obsolete dockerfileData-merging tests from `layer-composition-service.test.ts`
  - Remove `"emits a Dockerfile when all four slots are populated across layers"`
  - Remove `"does not emit a Dockerfile when no layer contributes dockerfileData"`
  - Remove `"does not emit a Dockerfile when dockerfileData is only partially populated"`
  - Remove `"later layer overwrites earlier layer for the same dockerfileData slot"`
  - `pnpm test` passes after removal

## Phase 3: Port template substitution

- [ ] CODE: Add `port` to `TemplateContext` and renderer
  - Feature: `TemplateContext` gains `port: number`; `{{port}}` placeholders in layer files are substituted with the resolved framework's port at composition time per REQ-4
  - Files: `src/commands/create/layers-composition/layer-composition-service.ts`
  - Acceptance:
    - `TemplateContext` interface has `port: number`
    - Template renderer replaces all `{{port}}` occurrences with `String(framework.port)`
    - `pnpm test` passes

- [ ] CODE: Replace hardcoded port with `{{port}}` in node framework files
  - Feature: Hardcoded port `3000` in `frameworks/express` and `frameworks/typescript` file content replaced with `{{port}}` template placeholder per REQ-4, NFR-2
  - Files: `src/commands/create/layers-composition/layers/frameworks-layer.ts`
  - Acceptance:
    - Any file content in `frameworks/express` or `frameworks/typescript` that previously contained the literal `3000` as a port now contains `{{port}}`
    - Generated output for `express + pnpm` has port `3000` substituted correctly in those files
    - `pnpm test` passes

## Phase 4: `html-css-js` framework and static runtime

- [ ] CODE: Add `frameworks/html-css-js`
  - Feature: New `FrameworkLayerData` entry for plain HTML/CSS/JS projects per REQ-5
  - Files: `src/commands/create/layers-composition/layers/frameworks-layer.ts`
  - Acceptance:
    - `devCopySource: "COPY public public"`
    - `port: 3000`
    - `watchSync: [{ path: "./public", target: "/app/public" }]`
    - `files` includes `package.json` with `"dev": "serve public -l {{port}}"` and `serve` in `devDependencies`
    - `files` includes `public/index.html`, `public/main.js`, `public/styles.css` (content migrated from `base-static-layer`)
    - `pnpm test` passes

- [ ] TASK: Register `html-css-js` in `prompt.port.ts` and `allowed-layer-combinations.json`
  - Add `HTML_CSS_JS: "html-css-js"` to `FRAMEWORK_OPTIONS` in `src/commands/create/prompt/prompt.port.ts`
  - Add `[FRAMEWORK_OPTIONS.HTML_CSS_JS]: "HTML/CSS/JS"` to `FRAMEWORK_LABELS`
  - Add `"html-css-js"` to `static_web.frameworks` in `src/commands/create/allowed-layer-combinations.json`
  - `pnpm check` passes

- [ ] CODE: Wire `base-static-layer` to `RuntimeLayerData`
  - Feature: `base-static-layer` conforms to `RuntimeLayerData`; public scaffold files migrated to `frameworks/html-css-js` per REQ-10
  - Files: `src/commands/create/layers-composition/layers/base-static-layer.ts`
  - Acceptance:
    - `baseStaticLayer` typed as `RuntimeLayerData`
    - `baseImage` is `"node:22-alpine"`
    - `docker-compose.dev.yml` absent from `files`
    - `dockerfileData` absent
    - `public/` files absent from `files` (now in `frameworks/html-css-js`)
    - `pnpm test` passes

## Phase 5: Remove `frameworks/none` and update `static_web` config

- [ ] TASK: Update `allowed-layer-combinations.json` for the new framework and package manager lists
  - Set `node.frameworks` to `["typescript", "express"]`
  - Set `static_web.frameworks` to `["react-vite", "html-css-js"]`
  - Set `static_web.packageManagers` to `["pnpm", "bun"]`
  - `pnpm test` passes

- [ ] CODE: Remove `frameworks/none` from codebase
  - Feature: The `none` framework option is removed from the layer registry and from `FRAMEWORK_OPTIONS` per REQ-6
  - Files: `src/commands/create/layers-composition/layers/frameworks-layer.ts`, `src/commands/create/prompt/prompt.port.ts`
  - Acceptance:
    - `frameworks/none` entry absent from `frameworksLayer`
    - `NONE` key absent from `FRAMEWORK_OPTIONS` and `FRAMEWORK_LABELS`
    - `pnpm test` passes

- [ ] CODE: Auto-select single-option package manager in prompt
  - Feature: When a runtime has exactly one valid package manager, the prompt selects it silently without presenting a selection UI per REQ-7
  - Files: `src/commands/create/prompt/clack-prompt.ts`
  - Acceptance:
    - When `allowedCombinations[runtime].packageManagers.length === 1`, `this.api.select` is not called for the package manager step
    - The sole valid package manager is included in the returned `CreateSelections`
    - When `packageManagers.length > 1`, existing multi-option behaviour is unchanged
    - `pnpm test` passes

## Phase 6: Wire bun and `react-vite`

- [ ] CODE: Wire `package-managers/bun` to `PackageManagerLayerData`
  - Feature: `package-managers/bun` gains `devInstall`, `devCmd`, `watchRebuild` per REQ-8
  - Files: `src/commands/create/layers-composition/layers/package-managers-layer.ts`
  - Acceptance:
    - `devInstall` is `"RUN npm install -g bun\nCOPY package.json bun.lock ./\nRUN bun install"`
    - `devCmd` is `["bun", "run", "dev"]`
    - `watchRebuild` is `[{ path: "./package.json" }, { path: "./bun.lock" }]`
    - `pnpm test` passes

- [ ] CODE: Wire `frameworks/react-vite` to `FrameworkLayerData`
  - Feature: `frameworks/react-vite` gains `port`, `devCopySource`, `watchSync` per REQ-9; dev server is made reachable from outside the Docker container
  - Files: `src/commands/create/layers-composition/layers/frameworks-layer.ts`
  - Acceptance:
    - `port: 5173`
    - `devCopySource` is `"COPY src src\nCOPY index.html .\nCOPY vite.config.ts .\nCOPY tsconfig*.json ."`
    - `watchSync: [{ path: "./src", target: "/app/src" }]`
    - `scripts.dev` in `package.json` includes `--host` (e.g. `"dev": "vite --host"`)
    - `dockerfileData` absent from entry
    - `pnpm test` passes

## Phase 7: Invariant tests

- [ ] CODE: Cross-combination consistency tests
  - Feature: Tests that verify `Dockerfile`, `docker-compose.dev.yml`, and `package.json` are mutually consistent for every valid combination per REQ-11
  - Files: `src/commands/create/layers-composition/layer-composition-service.test.ts`
  - Acceptance:
    - For every combination enumerated in `allowed-layer-combinations.json`, the test asserts:
      - compose `ports:` value is `"<n>:<n>"` where `<n>` matches the framework's declared `port`
      - compose `services.app.build.target` equals `"dev"`, which matches the stage name in the `Dockerfile` (`FROM base AS dev`)
      - `scripts.dev` in the generated `package.json` contains the framework's port as a substring
    - `pnpm test` passes

---

## Traceability Matrix

| Requirement ID | TODO Item                                                                                        | Status |
| -------------- | ------------------------------------------------------------------------------------------------ | ------ |
| REQ-1          | Phase 1 / TASK: Define typed layer data interfaces                                               | mapped |
| REQ-2          | Phase 1 / CODE: `buildDockerfileData` assembly function                                          | mapped |
| REQ-2          | Phase 2 / CODE: Update composition service to use assembly functions                             | mapped |
| REQ-3          | Phase 1 / CODE: `buildComposeDevYaml` assembly function                                          | mapped |
| REQ-3          | Phase 2 / CODE: Update composition service to use assembly functions                             | mapped |
| REQ-4          | Phase 3 / CODE: Add `port` to `TemplateContext` and renderer                                     | mapped |
| REQ-4          | Phase 3 / CODE: Replace hardcoded port with `{{port}}` in node framework files                   | mapped |
| REQ-5          | Phase 4 / CODE: Add `frameworks/html-css-js`                                                     | mapped |
| REQ-5          | Phase 4 / TASK: Register `html-css-js` in `prompt.port.ts` and `allowed-layer-combinations.json` | mapped |
| REQ-6          | Phase 5 / TASK: Update `allowed-layer-combinations.json`                                         | mapped |
| REQ-6          | Phase 5 / CODE: Remove `frameworks/none` from codebase                                           | mapped |
| REQ-7          | Phase 5 / TASK: Update `allowed-layer-combinations.json`                                         | mapped |
| REQ-7          | Phase 5 / CODE: Auto-select single-option package manager in prompt                              | mapped |
| REQ-8          | Phase 2 / CODE: Wire `package-managers/pnpm` to `PackageManagerLayerData`                        | mapped |
| REQ-8          | Phase 6 / CODE: Wire `package-managers/bun` to `PackageManagerLayerData`                         | mapped |
| REQ-9          | Phase 2 / CODE: Wire `frameworks/express` and `frameworks/typescript` to `FrameworkLayerData`    | mapped |
| REQ-9          | Phase 6 / CODE: Wire `frameworks/react-vite` to `FrameworkLayerData`                             | mapped |
| REQ-10         | Phase 2 / CODE: Wire `base-node-layer` to `RuntimeLayerData`                                     | mapped |
| REQ-10         | Phase 4 / CODE: Wire `base-static-layer` to `RuntimeLayerData`                                   | mapped |
| REQ-11         | Phase 7 / CODE: Cross-combination consistency tests                                              | mapped |
| NFR-1          | Phase 1 / CODE: `buildDockerfileData` assembly function                                          | mapped |
| NFR-1          | Phase 1 / CODE: `buildComposeDevYaml` assembly function                                          | mapped |
| NFR-2          | Phase 3 / CODE: Add `port` to `TemplateContext` and renderer                                     | mapped |
| NFR-2          | Phase 3 / CODE: Replace hardcoded port with `{{port}}` in node framework files                   | mapped |
| NFR-3          | Phase 1 / TASK: Define typed layer data interfaces                                               | mapped |
