# TODO — Docker Layer System: Single-Service Dev Environment

Requirements reference: `plans/universe-cli/docker.md`

---

## Phase 1 — Layer type refactor

- [x] CODE: Migrate all layer objects to `{ files, dockerfileData }` shape
  - Feature: Replace the current `Record<string, string>` layer type with `LayerData = { files: Record<string, string>, dockerfileData?: DockerfileData }` and update every layer except `services-layer` to the new shape
  - Files: `src/services/layers/always-layer.ts`, `src/services/layers/base-node-layer.ts`, `src/services/layers/base-static-layer.ts`, `src/services/layers/frameworks-layer.ts`, `src/services/layers/package-managers-layer.ts`, `src/services/layer-composition-service.ts`
  - Acceptance:
    - `LayerData` and `LayerRegistry` types are defined and exported
    - All layers except `services-layer` export objects conforming to `LayerData`
    - `services-layer` is unchanged; `layer-composition-service` contains a shim that normalises its flat `Record<string, Record<string, string>>` shape to `LayerData` before processing
    - All existing tests pass without modification

- [x] TASK: Run validation gate after refactor
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Phase 2 — DockerfileData schema and template

- [x] CODE: Define `DockerfileData` interface and `renderDockerfile` template function
  - Feature: Introduce the `DockerfileData` type and a pure `renderDockerfile` function that renders a two-stage (`base` + `dev`) Dockerfile from a complete data object using a JS template literal
  - Files: `src/services/layers/dockerfile-template.ts`
  - Acceptance:
    - `DockerfileData` is exported with optional fields: `baseImage`, `devInstall`, `devCopySource`, `devCmd`
    - `renderDockerfile(data: Required<DockerfileData>): string` is exported
    - Output contains a `base` stage with the given `baseImage` and `WORKDIR /app`
    - Output contains a `dev` stage with `devInstall`, `devCopySource`, and `CMD` rendered from `devCmd` as a JSON array
    - Unit tests cover at least one pnpm+express combination and verify the rendered string exactly

- [x] CODE: Wire `dockerfileData` merging and `Dockerfile` emission into the composition service
  - Feature: After all layers are composed, the composition service merges each layer's `dockerfileData` (later values overwrite earlier for the same key) and, if all four slots are present, calls `renderDockerfile` and adds `Dockerfile` to the output file set
  - Files: `src/services/layer-composition-service.ts`
  - Acceptance:
    - When composed layers collectively supply all four `DockerfileData` slots, `Dockerfile` appears in the output files with content matching `renderDockerfile`
    - When no layer contributes `dockerfileData`, `Dockerfile` is absent from the output
    - When `dockerfileData` is partially populated (some slots missing), `Dockerfile` is absent and no error is thrown
    - Unit tests cover: all-slots-present emits file; no slots emits nothing; partial slots emits nothing

- [x] TASK: Run validation gate
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Phase 3 — Layer data contributions

- [ ] CODE: Update `package-managers/pnpm` layer with `dockerfileData`, `.dockerignore`, and compose changes
  - Feature: The pnpm layer contributes `devInstall` and `devCmd` via `dockerfileData`, adds `.dockerignore` to `files`, and updates the `docker-compose.dev.yml` fragment to use `build: { context: ./, target: dev }` and `develop.watch` (sync `./src` → `/app/src`; rebuild on `package.json` change)
  - Files: `src/services/layers/package-managers-layer.ts`
  - Acceptance:
    - `dockerfileData.devInstall` copies `package.json` and `pnpm-lock.yaml` then enables pnpm via corepack and runs `pnpm install`
    - `dockerfileData.devCmd` is `["pnpm", "run", "dev"]`
    - `files[".dockerignore"]` contains `node_modules`, `dist`, and `.git`
    - `files["docker-compose.dev.yml"]` YAML fragment includes `build.context`, `build.target: dev`, and `develop.watch` with `sync` and `rebuild` actions
    - When merged with the `base/node` compose skeleton, the final `docker-compose.dev.yml` has no `image:` key and has the `build:` + `develop.watch` keys instead
    - Unit tests cover the above assertions on the layer object directly

- [ ] CODE: Update `frameworks/express` and `frameworks/typescript` layers with `dockerfileData`
  - Feature: Both framework layers contribute `baseImage: "node:22-alpine"` and `devCopySource` (copying `src/` and `tsconfig.json`) via `dockerfileData`; `frameworks/none` contributes no `dockerfileData`
  - Files: `src/services/layers/frameworks-layer.ts`
  - Acceptance:
    - `frameworks/express` and `frameworks/typescript` each have `dockerfileData.baseImage === "node:22-alpine"`
    - `frameworks/express` and `frameworks/typescript` each have `dockerfileData.devCopySource` containing `COPY src/` and `COPY tsconfig.json`
    - `frameworks/none` has no `dockerfileData` key (or `dockerfileData` is `undefined`)
    - Unit tests assert these values on each framework layer object

- [ ] TASK: Run validation gate
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Phase 4 — Integration tests and scaffold snapshots

- [ ] CODE: Add integration test scenarios covering Docker scaffold output
  - Feature: Integration tests assert that `universe create` with Node runtimes produces `Dockerfile`, `.dockerignore`, and an updated `docker-compose.dev.yml`; and that the static runtime produces none of these
  - Files: `src/integration-tests/create.test.ts`, `src/integration-tests/__snapshots__/create.test.ts.snap`
  - Acceptance:
    - Scenario `node + express + pnpm`: scaffold snapshot includes `Dockerfile`, `.dockerignore`, and `docker-compose.dev.yml` with `build:` + `develop.watch`; no `image: node:22-alpine` key in compose
    - Scenario `node + typescript + pnpm`: same Docker file assertions as above
    - Scenario `static + none`: scaffold snapshot contains neither `Dockerfile` nor `.dockerignore`; `docker-compose.dev.yml` retains `image: node:22-alpine` (no build key)
    - Snapshots are deterministic and committed
    - Tests are written first and initially fail, then pass after prior phases are complete

- [ ] TASK: Run full validation gate
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes

---

## Traceability Matrix

| Requirement ID | TODO Item                                                                                                        | Status |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| REQ-1          | Phase 1 / CODE: Migrate all layer objects to `{ files, dockerfileData }` shape                                   | mapped |
| REQ-2          | Phase 1 / CODE: Migrate all layer objects to `{ files, dockerfileData }` shape                                   | mapped |
| REQ-3          | Phase 2 / CODE: Define `DockerfileData` interface and `renderDockerfile` template function                       | mapped |
| REQ-4          | Phase 2 / CODE: Define `DockerfileData` interface and `renderDockerfile` template function                       | mapped |
| REQ-5          | Phase 2 / CODE: Wire `dockerfileData` merging and `Dockerfile` emission into the composition service             | mapped |
| REQ-6          | Phase 3 / CODE: Update `package-managers/pnpm` layer with `dockerfileData`, `.dockerignore`, and compose changes | mapped |
| REQ-7          | Phase 3 / CODE: Update `frameworks/express` and `frameworks/typescript` layers with `dockerfileData`             | mapped |
| REQ-8          | Phase 3 / CODE: Update `frameworks/express` and `frameworks/typescript` layers with `dockerfileData`             | mapped |
| NFR-1          | Phase 1 / TASK: Run validation gate after refactor                                                               | mapped |
| NFR-2          | Phase 4 / CODE: Add integration test scenarios covering Docker scaffold output                                   | mapped |
