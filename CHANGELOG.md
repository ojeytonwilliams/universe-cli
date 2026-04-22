# Changelog

## [3.19.3] - 2026-04-22

### refactor: Simplify service layer composition

- Merged `services-layer.ts` into JSON files and updated the composition logic to use a unified structure for services and databases.
- Motivation: Reduces code duplication and makes it easier to add or modify service/database layers in the future.

## [3.19.2]

### refactor: Move layer types to schemas/layers

- Moved FrameworkLayerData, PackageManagerLayerData, and RuntimeLayerData types from layers/layer-types.ts to schemas/layers.js.
- Motivation: Consolidates type definitions with their schemas, reducing duplication and improving maintainability. Updated all imports to reference the new location.

### refactor: Move Dockerfile data builder to layer-composition-service

- Moved the logic from build-dockerfile-data.ts and its test to layer-composition-service for better cohesion and maintainability.
- Motivation: Consolidates Dockerfile data construction with related layer composition logic, reducing duplication and improving clarity.

## [3.19.0] - 2026-04-22

### feat: Add preinstall script for package manager enforcement

- Adds a `preinstall` script to generated `package.json` files for supported package managers (e.g., pnpm), enforcing the use of the correct package manager for installs.
- Motivation: Prevents accidental use of the wrong package manager, reducing support issues and ensuring consistent local and CI environments.

## [3.18.0] - 2026-04-22

### refactor: Update layer composition and remove obsolete frameworks-layer

- Refactored layer composition logic and tests to support a new, more flexible framework structure.
- Removed obsolete frameworks-layer files to reduce confusion and technical debt.
- Motivation: Simplifies future framework additions and improves maintainability.

### fix: getLabel returns key if label missing

- Ensures that missing labels now return the key, preventing undefined values in UI and logs.

### refactor: Remove legacy allowed-layer-combinations files and update validation

- Removed outdated files and updated validation logic to match the new layer composition system.
- Motivation: Reduces maintenance burden and aligns validation with current architecture.

### docs/chore/test/feat: Other notable changes

- Improved type safety, validation, and error output across layer composition and manifest logic.
- Enhanced label lookup and prompt handling for better user experience.
- Added utilities and helpers for allowed-configuration and label management.
- Updated documentation and scripts for clarity and developer workflow improvements.
- Various test and schema updates to support new layer structure and ensure correctness.

## [3.17.0] - 2026-04-21

### feat: Cross-combination consistency invariant tests (Phase 7)

- Added `scripts.dev: "PORT={{port}} node dist/index.js"` to `frameworks/express` and `frameworks/typescript` package.json so the rendered dev script always contains the framework port.
- Updated `frameworks/react-vite` dev script from `"vite --host"` to `"vite --host --port {{port}}"` so the rendered script contains port 5173.
- Added cross-combination invariant tests in `layer-composition-service.test.ts` that iterate every valid runtime/framework/package-manager combination from `allowed-layer-combinations.json` and assert:
  - compose `ports:` is `"<port>:<port>"` matching the framework's declared port,
  - compose `services.app.build.target` is `"dev"` and `Dockerfile` contains `FROM base AS dev`,
  - `scripts.dev` in the generated `package.json` contains the framework port as a substring.

## [3.16.0] - 2026-04-21

### feat: Wire bun package manager and react-vite framework (Phase 6)

- `package-managers/bun` typed as `PackageManagerLayerData` with `devInstall` (global bun install via npm), `devCmd: ["bun", "run", "dev"]`, and `watchRebuild` for `package.json` and `bun.lock`.
- `frameworks/react-vite` typed as `FrameworkLayerData` with `port: 5173`, `devCopySource` copying `src`, `index.html`, `vite.config.ts`, and `tsconfig*.json`, `watchSync` for `./src`, and `dev` script updated to `vite --host` so the dev server is reachable from outside the Docker container.

## [3.15.0] - 2026-04-21

### feat: Remove frameworks/none and enable static_web package manager selection (Phase 5)

- `allowed-layer-combinations.json` updated: `node.frameworks` is now `["typescript", "express"]`, `static_web.frameworks` is `["react-vite", "html-css-js"]`, and `static_web.packageManagers` is `["pnpm", "bun"]` — the `none` framework option is removed from all runtimes.
- `frameworks/none` entry removed from `frameworksLayer`; `NONE` key removed from `FRAMEWORK_OPTIONS` and `FRAMEWORK_LABELS`.
- `ClackPrompt` now auto-selects the sole package manager silently when `packageManagers.length === 1`, preserving the interactive select for runtimes with multiple options.

## [3.14.0] - 2026-04-20

### feat: Add html-css-js framework and wire base-static-layer (Phase 4)

- `frameworks/html-css-js` added as `FrameworkLayerData` with `port: 3000`, `devCopySource: "COPY public public"`, watchSync, and the public scaffold files (`index.html`, `main.js`, `styles.css`) migrated from `base-static-layer`.
- `HTML_CSS_JS` registered in `FRAMEWORK_OPTIONS`, `FRAMEWORK_LABELS`, and `allowed-layer-combinations.json`.
- `base-static-layer` typed as `RuntimeLayerData`; `dockerfileData`, `docker-compose.dev.yml`, and `public/` files removed.
- `base/static` registered in `defaultRuntimeLayers` so the static runtime produces Dockerfile and docker-compose for typed framework combinations.

## [3.13.0] - 2026-04-20

### feat: Port template substitution in layer files (Phase 3)

- `TemplateContext` gains `port: number`; `LayerTemplateRenderer` now substitutes `{{port}}` with the framework's port number.
- `frameworks/express` and `frameworks/typescript` `src/index.ts` files replace hardcoded `3000` with `{{port}}` placeholder, resolved at composition time.

## [3.12.0] - 2026-04-20

### feat: Wire node layers to typed interfaces and update composition service (Phase 2)

- `baseNodeLayer` typed as `RuntimeLayerData`; `docker-compose.dev.yml` removed from its files.
- `frameworks/express` and `frameworks/typescript` typed as `FrameworkLayerData`; `dockerfileData` removed; `port`, `devCopySource`, and `watchSync` added.
- `package-managers/pnpm` typed as `PackageManagerLayerData`; `dockerfileData` and `docker-compose.dev.yml` removed; `devInstall`, `devCmd`, and `watchRebuild` added.
- `LayerCompositionService` now calls `buildDockerfileData` and `buildComposeDevYaml` via typed layer registries instead of the `mergeDockerfileData` + `isCompleteDockerfileData` pattern.
- Obsolete dockerfileData-merging unit tests removed; new Dockerfile and docker-compose.dev.yml emission tests added for express+pnpm and typescript+pnpm combinations.

## [3.11.0] - 2026-04-20

### feat: Add typed layer data interfaces and pure assembly functions

- Defined `RuntimeLayerData`, `FrameworkLayerData`, `PackageManagerLayerData`, `WatchSyncEntry`, and `WatchRebuildEntry` interfaces in `layer-types.ts`, giving each layer kind an explicit contract rather than an open-ended object shape.
- Added `buildDockerfileData` pure function that assembles `Required<DockerfileData>` from the three typed layer objects, replacing the runtime merge + completeness-guard pattern.
- Added `buildComposeDevYaml` pure function that generates a complete `docker-compose.dev.yml` YAML string from typed layer data, including build context, port mapping, and file-watch entries.

## [3.10.0] - 2026-04-20

### feat: Add Dockerfile to static web scaffold

- Static web apps now generate a `Dockerfile` using `node:22-alpine` and `npx serve public -l 3000`, giving them the same Docker-first DX as Node apps.
- `docker-compose.dev.yml` updated to use `build: { context: ./, target: dev }` instead of `image: node:22-alpine` with a volume mount, so compose and the Dockerfile are consistent.
- `.dockerignore` added to static scaffold (excludes `.git`).
- Fixed a latent TypeScript error: `dockerfileData` in `FrameworkLayer` is now correctly typed as optional, since static framework entries rely on the base layer to supply all Dockerfile slots.

## [3.9.0] - 2026-04-20

### Docs: Update add-framework skill for config-driven workflow

- Replaced Step 5 (edit `create-input-validation-service.ts` + add acceptance test) and Step 6 (edit `clack-prompt.ts`) with a single new Step 5: add the framework key to the appropriate runtime's `"frameworks"` array in `allowed-layer-combinations.json`.
- Updated the frontmatter description and constraints to reflect that the only files requiring changes when adding a framework are `allowed-layer-combinations.json`, `frameworks-layer.ts`, and `prompt.port.ts`.

## [3.8.0] - 2026-04-20

### Refactor: Drive clack-prompt from allowed-layer-combinations config

- Removed seven hardcoded option arrays (`NODE_FRAMEWORK_OPTIONS`, `STATIC_FRAMEWORK_OPTIONS`, `NODE_DATABASE_OPTIONS`, `STATIC_DATABASE_OPTIONS`, `NODE_SERVICE_OPTIONS`, `STATIC_SERVICE_OPTIONS`, `NODE_PACKAGE_MANAGER_OPTIONS`) from `clack-prompt.ts`, replacing them with `getFrameworkOptions`, `getDatabaseOptions`, and `getServiceOptions` helpers that read directly from `allowedCombinations`.
- The package manager prompt is now driven by config: shown only when `allowedCombinations[runtime].packageManagers.length > 0` and populated from that array.
- Removed two config-data tests from `clack-prompt.test.ts` (`filters framework options for Static runtime`, `includes TypeScript in framework options for Node runtime`) — these were asserting config contents, not prompt logic.

## [3.7.0] - 2026-04-20

### Refactor: Drive validation service from allowed-layer-combinations config

- Replaced five hardcoded `SUPPORTED_*` arrays in `create-input-validation-service.ts` with lookups against `allowedCombinations`. The separate `validateNodeSelections` and `validateStaticSelections` methods are unified into a single `validateRuntimeSelections(input, config)`, making it trivial to support new runtimes purely through config.
- Removed four config-data tests from `create-input-validation-service.test.ts` (`accepts typescript framework for Node runtime`, `accepts react-vite framework for static_web runtime`, `rejects typescript framework for static_web runtime`, `rejects express framework for static_web runtime`) — these were asserting config contents, not validation logic.

## [3.6.0] - 2026-04-20

### Refactor: Introduce config-driven allowed layer combinations (foundation)

- Added `src/commands/create/allowed-layer-combinations.json` encoding which frameworks, databases, platform services, and package managers are valid per runtime. This is the single source of truth that will replace duplicated hardcoded arrays across the prompt and validation service.
- Added `src/commands/create/allowed-layer-combinations.ts` with a Zod schema that parses and validates the JSON at module-load time. A malformed config will throw at startup, surfaced by the e2e test — no dedicated unit tests required.
- Added `resolveJsonModule: true` to `tsconfig.json` to enable typed JSON imports.

## [3.5.0] - 2026-04-20

### Refactor: Split command handlers and modularize CLI

- Split all command handlers into per-command directories under `src/commands/`, clarifying code ownership and reducing coupling. Updated all imports and removed the old central `commands.ts` file. This modularization improves maintainability and makes it easier to extend or modify individual commands without risk of cross-command breakage. No user-facing behavior was changed.

## [3.4.0] - 2026-04-20

### Refactor: Move internal modules for maintainability

- Moved `package-manager` and `prompt` modules into `src/commands/create/` to clarify ownership and reduce top-level clutter. This change makes the codebase easier to navigate and sets up for future refactors of the create command. All imports and tests were updated to reference the new locations. No user-facing behavior was changed.

## [3.3.6] - 2026-04-17

### Integration tests for Docker scaffold output

- Added 5 targeted integration tests in a `"docker scaffold output"` describe block covering: `node + express + pnpm` Dockerfile content, `node + express + pnpm` `.dockerignore` and compose shape, `node + typescript + pnpm` Dockerfile content, `node + typescript + pnpm` compose shape, and `static + none` absence of Docker artefacts.
- Static scaffold test confirms `docker-compose.dev.yml` retains `image: node:22-alpine` and has no `build:` key.
- `parse as parseYaml` from `yaml` imported into the integration test file to enable compose fragment assertions.

## [3.3.5] - 2026-04-17

### Layer data contributions: pnpm and framework layers now supply `dockerfileData`

- `package-managers/pnpm` layer now contributes `dockerfileData.devInstall` (copies `package.json` + `pnpm-lock.yaml`, enables pnpm via corepack, runs `pnpm install`) and `dockerfileData.devCmd` (`["pnpm", "run", "dev"]`).
- `package-managers/pnpm` adds `.dockerignore` (excludes `node_modules`, `dist`, `.git`) and updates its `docker-compose.dev.yml` fragment to use `build: { context: ./, target: dev }` and `develop.watch` (sync `./src` → `/app/src`; rebuild on `package.json` change).
- `base/node` compose fragment trimmed to `ports` only; `image:`, `working_dir`, `volumes`, and `command` removed as they are superseded by the Dockerfile and Compose Watch approach.
- `frameworks/express` and `frameworks/typescript` each contribute `dockerfileData.baseImage: "node:22-alpine"` and `dockerfileData.devCopySource` (copies `src/` and `tsconfig.json`); `frameworks/none` contributes no `dockerfileData`.
- `FrameworkLayer` interface introduced in `frameworks-layer.ts` (imports `DockerfileData` from `dockerfile-template.ts`) so the layer record is correctly typed.

## [3.3.4] - 2026-04-17

### Add `renderDockerfile` template and wire `dockerfileData` merging into the composition service

- `dockerfile-template.ts` introduced with `DockerfileData` type and `renderDockerfile` function; renders a two-stage (`base` + `dev`) Dockerfile from a complete data object using a template literal.
- `layer-composition-service.ts` now merges `dockerfileData` contributions from all resolved layers and emits a `Dockerfile` into the scaffold output when all four slots (`baseImage`, `devInstall`, `devCopySource`, `devCmd`) are present; emits nothing when data is absent or incomplete.
- `DockerfileData` moved from `layer-composition-service.ts` to `dockerfile-template.ts` (its natural owner); re-exported from the composition service for consumers.

## [3.3.3] - 2026-04-17

### Extend layer type to `{ files, dockerfileData }` shape

- All layer objects (`always`, `base/node`, `base/static`, `frameworks/*`, `package-managers/*`) now export `{ files: Record<string, string>, dockerfileData?: DockerfileData }` instead of a flat `Record<string, string>`.
- `DockerfileData` and `LayerData` interfaces added to `layer-composition-service.ts` and exported; `LayerRegistry` updated to `Record<string, LayerData | undefined>`.
- `services-layer` left in the old flat shape for now; a shim in `defaultLayerRegistry` normalises it transparently until migration is done.
- No change to scaffolded project output or any external behaviour.

## [3.3.2] - 2026-04-16

### Move routing and validation to `bin.ts`; slim `runCli`

- `bin.ts` now owns all argv parsing, `--help`/`-h` handling, unknown-command detection, and per-command arg-count and env-value validation via an exported `route(argv, deps, observability)` function.
- `runCli` in `cli.ts` is reduced to a three-argument observability wrapper `(command, handler, observability)` with no knowledge of argv, commands, or dep shapes.
- Observability is only tracked for commands that reach `runCli`; help, unknown-command, and bad-arg branches return early without emitting tracking events.
- All integration tests updated to call `route` instead of the old `runCli` signature.

## [3.3.1] - 2026-04-16

### Flatten handler and CLI dependency injection

- Removed nested `Services` and `Adapters` interfaces from `commands.ts`; each handler now declares its own flat inline dep type containing only the members it needs.
- `CliDependencies` in `cli.ts` is now a single flat interface — no `services:` or `adapters:` sub-objects.
- `bin.ts` wiring updated to pass a flat dep object to `runCli`.
- All unit and integration test dep helpers updated to reflect the flat shape; no `services:` or `adapters:` keys remain in any test dep object.

## [3.3.0] - 2026-04-15

### Package manager abstraction and Bun adapter

- Introduced `PackageManagerService` abstraction to support multiple package managers.
- Added Bun package manager adapter with full test coverage.
- Updated CLI wiring and integration stubs for extensibility.
- Enforced strict TDD, lint, and type-check compliance for all new code.
- Improved error handling and test reliability for unknown managers and adapter failures.

## [3.2.0] - 2026-04-15

### Repartition layers: slim base/node, introduce package-manager and framework layers

- **`base/node` slimmed down**: Runtime layer now contains only `Procfile` and `docker-compose.dev.yml` (with `command: sh start.sh`). All TypeScript, scripts, and package-manager artifacts removed from the runtime layer.
- **`package-managers/pnpm` layer**: Contributes `pnpm-workspace.yaml`, `start.sh` (`pnpm install && pnpm dev`), `dev` script, and `preinstall` script.
- **`package-managers/bun` layer**: Contributes `start.sh` (`bun install && bun dev`) and `dev` script (no preinstall hook in v1).
- **`frameworks/typescript` layer**: Contributes TypeScript devDependency, `tsconfig.json`, minimal TS HTTP server `src/index.ts`, `build` and `start` scripts.
- **`frameworks/express` layer**: Contributes Express dependency, TypeScript devDependency, Express-specific `src/index.ts`, `tsconfig.json`, `build` and `start` scripts.
- **Data-driven framework resolution**: `LayerCompositionService` now resolves `frameworks/${framework}` without branching; adding new frameworks requires no changes to the service.
- **Deterministic layer order**: `always` → `base/{runtime}` → `package-managers/{manager}` (Node only) → `frameworks/{framework}` → `services/{service}`.
- **Combination coverage expanded**: Layer-resolution tests now cover all pnpm/bun × express/typescript/none × database/service combinations.

## [3.1.0] - 2026-04-15

### Extend create prompt and validation with package manager selection and TypeScript framework

- **Runtime renamed**: `node_ts` → `node` across prompt contract, validation, layers, commands, and all tests. The runtime is Node.js; TypeScript is now a first-class framework choice.
- **TypeScript framework option**: `FRAMEWORK_OPTIONS.TYPESCRIPT` (`"typescript"`) added so TypeScript-only Node projects can be selected independently of Express.
- **Package manager selection**: `PACKAGE_MANAGER_OPTIONS` (`pnpm`, `bun`), `PACKAGE_MANAGER_LABELS`, and `PackageManagerOption` type introduced in the prompt port. `CreateSelections` gains an optional `packageManager` field.
- **Prompt flow updated**: `ClackPromptAdapter` asks for package manager after framework selection when runtime is `node`; static web flow is unchanged and never requests a package manager. Confirmation message includes the selected package manager for Node projects.
- **Validation rules enforced**: `CreateInputValidationService` now rejects Node selections without a supported package manager, and rejects static selections that supply a package manager or a Node-only framework (`typescript`, `express`).
- **Accepted selection tuples documented**: matrix of all valid `(runtime, framework, package-manager)` combinations added to the PRD.

## [3.0.8] - 2026-04-14

### Align Node.js scaffold with pnpm-first conventions

Three corrections to the scaffold generated by `universe create` for Node.js projects:

- **pnpm config location**: Security settings (`blockExoticSubdeps`, `minimumReleaseAge`, `trustPolicy`, `engineStrict`) now live as top-level camelCase keys in `pnpm-workspace.yaml` (pnpm v10 format) instead of `.npmrc`. No `.npmrc` is generated for any scaffold type. Static scaffolds receive an empty `pnpm-workspace.yaml` as a workspace root marker.
- **pnpm scripts**: The `dev` script now invokes `pnpm run build && pnpm run start` rather than `npm run`, keeping the scaffold consistent with the enforced `only-allow pnpm` constraint.
- **Per-layer version constants**: The shared `dependency-versions.ts` module is removed. Each layer file now defines its own version constants (`TYPESCRIPT_VERSION`, `EXPRESS_VERSION`). This prevents a future React or other framework layer from being forced to share a version namespace with Express.

## [3.0.7] - 2026-04-14

### Add integration test coverage for PackageManager and RepoInitialiser wiring

The create integration tests now verify the full Phase 1–4 flow end-to-end. Four new test cases use `vi.fn()` inline test doubles in place of the silent stub adapters to assert that `packageManager.install` is called with the target directory for Node.js scaffolds, is not called for static scaffolds, and that `repoInitialiser.initialise` is called with the target directory for both scaffold types.

## [3.0.6] - 2026-04-14

### Move subprocess defaults into adapters and add pnpm-workspace.yaml to Node.js scaffold

`PnpmPackageManagerAdapter` and `GitRepoInitialiserAdapter` now own their production subprocess and filesystem wiring as default constructor parameter values. Previously these helpers lived in `bin.ts` and were passed in explicitly; now `bin.ts` just calls `new PnpmPackageManagerAdapter()` and `new GitRepoInitialiserAdapter()`. Injectable parameters remain for test doubles.

The Node.js scaffold now includes an empty `pnpm-workspace.yaml`. Without it, pnpm treats the project as part of any parent workspace that contains it; the empty file declares the project as a standalone workspace root.

## [3.0.5] - 2026-04-14

### Add RepoInitialiser port and GitRepoInitialiserAdapter

The `create` command now initialises a git repository after scaffolding files. `GitRepoInitialiserAdapter` runs `git init`, `git add .`, and `git commit -m "chore: initial commit"` in sequence — any non-zero exit rejects with `RepoInitialisationError`. For Node.js scaffolds, git init follows both `specifyDeps` and `install`; for static scaffolds it follows the filesystem write directly. The adapter takes an injectable subprocess runner so it can be tested without a real git installation.

## [3.0.4] - 2026-04-14

### Add PackageManager port and PnpmPackageManagerAdapter

The `create` command now manages Node.js dependencies via a `PackageManager` port with two methods: `specifyDeps` and `install`. `specifyDeps` runs `pnpm install --lockfile-only` (respecting `.npmrc` constraints including `minimumReleaseAge`), reads the exact resolved versions with `pnpm list --json --depth=0 --lockfile-only`, and pins them into `package.json` — replacing `^major` ranges with exact versions. `install` then populates `node_modules` from the pinned manifest. The separation makes installation optional without affecting version pinning. `PnpmPackageManagerAdapter` wires these commands via an injectable subprocess runner, tested with synchronous test doubles without invoking real pnpm.

## [3.0.3] - 2026-04-14

### Add pnpm supply chain security artefacts to Node.js scaffold

Generated Node.js projects now include a `.npmrc` with four pnpm security settings (`blockExoticSubdeps=true`, `minimumReleaseAge=1440`, `trustPolicy=no-downgrade`, `engine-strict=true`) and a `preinstall` script (`npx only-allow pnpm`) that enforces pnpm as the only permitted package manager. Static scaffolds are unaffected.

## [3.0.2] - 2026-04-14

### Centralize dependency versions and switch docker-compose to pnpm

Dependency version strings were scattered across layer files as exact pinned values. A new `dependency-versions.ts` config centralises them as major-version ranges (e.g. `"^5"`), so updating a dependency requires changing one line rather than hunting across layer files. The `docker-compose.dev.yml` template is also updated to use `pnpm install && pnpm dev` in preparation for pnpm-first scaffolding.

## [3.0.1] - 2026-04-14

### Consolidate observability best-effort policy into a shared base class

The "best-effort" guarantee for observability — that a failing backend can never affect command exit codes — was previously enforced by free functions (`safeTrack`, `safeError`) at every call site. This scattered the policy across the codebase and made it easy to accidentally bypass by calling `track`/`error` directly.

`safeTrack` and `safeError` are now methods on the `ObservabilityClient` interface, with the try/catch implemented once in a new `BaseSafeObservabilityClient` abstract class. All concrete adapters extend this base and only implement `track` and `error`. Call sites use `client.safeTrack()`/`client.safeError()` and the policy is enforced regardless of which adapter is injected.

## [3.0.0] - 2026-04-13

### Remove explicit environment arguments from deploy, list, promote, rollback, and teardown

**Breaking change:** `deploy`, `list`, `promote`, `rollback`, and `teardown` no longer accept an environment or target-environment argument. Each command's target environment is now implicit in its semantics: `deploy` and `list` always operate against preview; `promote` and `rollback` always target production; `teardown` carries no environment selector.

- **Port contracts** (`src/ports/deploy-client.ts`, `list-client.ts`, `promote-client.ts`, `rollback-client.ts`, `teardown-client.ts`): request types simplified to `{ manifest: PlatformManifest }`; `environment`/`targetEnvironment` fields removed from all receipt and response types.
- **Command handlers** (`src/commands.ts`): `argv[2]` environment parsing and preview/production validation removed from all five handlers; too-many-args guard tightened from `> 3` to `> 2`; user-facing output now hard-codes the fixed environment string rather than reading it from the adapter receipt.
- **CLI wiring** (`src/cli.ts`): `context` removed from the `deploy`, `list`, `promote`, `rollback`, and `teardown` command definitions; observability tracks those commands with empty context (`{}`); `logs` and `status` retain their environment context wiring unchanged.
- **Stub adapters** (`src/adapters/stub-{deploy,list,promote,rollback,teardown}-client.ts`): per-environment counter keys replaced with project-scoped counters; generated IDs embed the fixed environment string where appropriate (`-preview-` for deploy, `-production-` for promote/rollback); teardown IDs drop the environment segment entirely.
- **Tests updated**: adapter unit tests, CLI unit tests, and integration tests all updated to use manifest-only request contracts and the new receipt shapes; invalid-environment and default-environment test cases removed; too-many-args fixtures updated to three-element argv arrays.

## [2.27.0] - 2026-04-10

### Phase 3 — Teardown Command Test Coverage, Guardrails, and Documentation

- **Stub adapter unit tests** (`src/adapters/stub-teardown-client.test.ts`): deterministic ID generation, per-environment counter isolation, sentinel failure raises `TeardownError`, instance state isolation.
- **CLI integration tests** (`src/cli.teardown.test.ts`): 13 tests covering all success and error paths, argument validation, observability, and default environment (`preview`).
- **E2E tests** (`src/teardown.e2e.test.ts`): create-then-teardown flow confirms output contains project name, environment, and stub teardown ID; sentinel failure exits 20.
- **Container guard** (`src/container.test.ts`): asserts `teardownClient` is an instance of `StubTeardownClient`; all 9 commands now guarded.
- **Design docs**: TDN-001–005 validated in `design/assumptions-register.md`; two new assumptions (TDN-N01 receipt shape, TDN-N02 all-implemented milestone) captured; remaining migration unknowns documented; `design/future-command-expansion.md` already listed teardown at v2.25.0.
- **Spike complete**: all 9 CLI commands (`create`, `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, `teardown`) are fully implemented with stub adapters. `DEFERRED_COMMANDS` is now empty.

## [2.26.0] - 2026-04-10

### Phase 2 — Teardown Command Behavior Hardening and UX Consistency

- **Argument validation**: `universe teardown` accepts zero, one, or two arguments; excess arguments exit 1 with usage guidance; unsupported environment value exits 6 via `UnsupportedCombinationError`; environment defaults to `preview` when omitted.
- **Observability**: `teardown.start`, `teardown.success`, and `teardown.failure` events emitted via `safeTrack`; observability failures do not affect teardown result or exit code; only non-sensitive `targetEnvironment` and `name` fields are emitted.
- **UX copy**: success output format `Tore down project "<name>" in <targetEnvironment>. Teardown ID: <teardownId>`; error messages follow existing imperative/actionable tone; output is deterministic for snapshot-friendly testing.

## [2.25.0] - 2026-04-10

### Phase 1 — Teardown Command Trivial Prototype

- **`TeardownClient` port** (`src/ports/teardown-client.ts`): `teardown(request): Promise<TeardownReceipt>`; request carries `manifest` and `targetEnvironment`; response carries `name`, `targetEnvironment`, and `teardownId`.
- **`TeardownError`** (`src/errors/cli-errors.ts`): typed error with exit code 20 and message `Failed to tear down project "<name>": <reason>`.
- **`StubTeardownClient` adapter** (`src/adapters/stub-teardown-client.ts`): deterministic stub with incrementing ID per project/environment pair; rejects with `TeardownError` for sentinel project name `"teardown-failure"`.
- **`teardown` CLI handler** (`src/cli.ts`): `universe teardown [directory] [target-environment]` promoted from deferred; reads `platform.yaml`, validates manifest, delegates to `teardownClient`, outputs `Tore down project "<name>" in <targetEnvironment>. Teardown ID: <teardownId>`; all commands now implemented (DEFERRED_COMMANDS is empty).
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `teardownClient` exported as `StubTeardownClient` instance and wired into `runCli` dependency graph.

## [2.24.0] - 2026-04-10

### Phase 3 — List Command Test Coverage, Guardrails, and Documentation

- **Stub adapter unit tests** (`src/adapters/stub-list-client.test.ts`): deterministic entry ordering, stable field types, repeated calls return same entries, sentinel failure raises `ListError`, instance isolation.
- **CLI integration tests** (`src/cli.list.test.ts`): 13 tests covering all success and error paths, argument validation, observability, and default environment.
- **E2E tests** (`src/list.e2e.test.ts`): create-then-list flow confirms output contains project name, environment, and stub deployment ID; sentinel failure exits 19.
- **Container guard** (`src/container.test.ts`): asserts `listClient` is an instance of `StubListClient`.
- **Design docs**: LST-001–005 validated in `design/assumptions-register.md`; two new assumptions (LST-N01, LST-N02) captured around response shape and type boundary choices; remaining migration unknowns documented; `design/future-command-expansion.md` lists `list` as implemented at v2.22.0.

## [2.23.0] - 2026-04-10

### Phase 2 — List Command Behavior Hardening and UX Consistency

- **Argument validation**: `universe list` accepts zero, one, or two arguments; excess arguments exit 1 with usage guidance; unsupported environment value exits 6 via `UnsupportedCombinationError`; environment defaults to `preview` when omitted.
- **Observability**: `list.start`, `list.success`, and `list.failure` events emitted via `safeTrack`; observability failures do not affect list result or exit code; only non-sensitive `environment` and `name` fields are emitted.
- **UX copy**: success output format `Deployments for project "<name>" in <env>:\n  <id> — <state> (deployed: <deployedAt>)`; error messages follow existing imperative/actionable tone; output is deterministic for snapshot-friendly testing.

## [2.22.0] - 2026-04-10

### Phase 1 — List Command Trivial Prototype

- **`ListClient` port** (`src/ports/list-client.ts`): `getList(request): Promise<ListResponse>`; request carries `manifest` and `environment`; response carries `name`, `environment`, and ordered `deployments` array with `deploymentId`, `state`, and `deployedAt` fields.
- **`ListError`** (`src/errors/cli-errors.ts`): typed error with exit code 19 and message `Failed to list deployments for project "<name>": <reason>`.
- **`StubListClient` adapter** (`src/adapters/stub-list-client.ts`): deterministic stub returning two fixed deployments (`deploy-stub-001` ACTIVE, `deploy-stub-002` INACTIVE); rejects with `ListError` for sentinel project name `"list-failure"`.
- **`list` CLI handler** (`src/cli.ts`): `universe list [directory] [environment]` promoted from deferred; reads `platform.yaml`, validates manifest, delegates to `listClient`, outputs project name, environment, and formatted deployment entries.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `listClient` exported as `StubListClient` instance and wired into `runCli` dependency graph.

## [2.21.0] - 2026-04-10

### Phase 3 — Status Command Test Coverage, Guardrails, and Documentation

- **Stub adapter unit tests** (`src/adapters/stub-status-client.test.ts`): deterministic snapshot ordering, stable field types, repeated calls return same snapshot, sentinel failure raises `StatusError`, instance isolation.
- **CLI integration tests** (`src/cli.status.test.ts`): 13 tests covering all success and error paths, argument validation, observability, and default environment.
- **E2E tests** (`src/status.e2e.test.ts`): create-then-status flow, sentinel failure exit 18.
- **Container guard** (`src/container.test.ts`): asserts `statusClient` is an instance of `StubStatusClient`.
- **Typed port import** (`src/cli.ts`): `CliDependencies.statusClient` uses `StatusRequest`/`StatusResponse` from the port contract rather than inline anonymous types; stale `oxlint-disable` directives removed from all e2e test files.
- **Design docs**: STS-001–005 validated in `design/assumptions-register.md`; two new assumptions (STS-N01, STS-N02) captured; remaining migration unknowns documented; `design/future-command-expansion.md` lists `status` as implemented at v2.19.0.

## [2.20.0] - 2026-04-10

### Phase 2 — Status Command Behavior Hardening

- **Argument validation**: `universe status` accepts zero, one, or two arguments; excess arguments exit 1 with usage guidance; unsupported environment exits 6 via `UnsupportedCombinationError`; environment defaults to `preview`.
- **Observability**: `status.start`, `status.success`, and `status.failure` events emitted via `safeTrack`; observability errors do not affect exit code or output; only non-sensitive `environment` and `name` fields are included in payloads.
- **UX copy**: success output format `Status of project "<name>" in <env>: <state> (last updated: <updatedAt>)`; error messages follow existing imperative/actionable tone; output is deterministic for snapshot-friendly testing.

## [2.19.0] - 2026-04-10

### Phase 1 — Status Command Trivial Prototype

- **`StatusClient` port** (`src/ports/status-client.ts`): `getStatus(request): Promise<StatusResponse>`; request carries `manifest` and `environment`; response carries `name`, `environment`, `state` (`StatusState` union), and `updatedAt` timestamp.
- **`StatusError`** (`src/errors/cli-errors.ts`): typed error with exit code 18 and message `Failed to retrieve status for project "<name>": <reason>`.
- **`StubStatusClient` adapter** (`src/adapters/stub-status-client.ts`): deterministic stub returning `state: "ACTIVE"` and fixed `updatedAt`; rejects with `StatusError` for sentinel project name `"status-failure"`.
- **`status` CLI handler** (`src/cli.ts`): `universe status [directory] [environment]` promoted from deferred; reads `platform.yaml`, validates manifest, delegates to `statusClient`, outputs `Status of project "<name>" in <env>: <state> (last updated: <updatedAt>)`.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `statusClient` exported as `StubStatusClient` instance and wired into `runCli` dependency graph.

## [2.18.0] - 2026-04-09

### Phase 3 — Logs Command Test Coverage, Guardrails, and Documentation

- **Stub adapter unit tests** (`src/adapters/stub-logs-client.test.ts`): deterministic entry ordering, stable field types, repeated calls return same entries, sentinel failure raises `LogsError`, instance isolation.
- **CLI integration tests** (`src/cli.logs.test.ts`): 13 tests covering all success and error paths, argument validation, observability, and default environment.
- **E2E tests** (`src/logs.e2e.test.ts`): create-then-logs flow, sentinel failure exit 17.
- **Container guard** (`src/container.test.ts`): asserts `logsClient` is an instance of `StubLogsClient`.
- **Design docs**: LOG-001–005 validated in `design/assumptions-register.md`; `design/future-command-expansion.md` lists `logs` as implemented at v2.16.0.

## [2.17.0] - 2026-04-09

### Phase 2 — Logs Command Behavior Hardening

- **Argument validation**: `universe logs` accepts zero, one, or two arguments; excess arguments exit 1 with usage guidance; unsupported environment exits 6 via `UnsupportedCombinationError`; environment defaults to `preview`.
- **Observability**: `logs.start`, `logs.success`, and `logs.failure` events emitted via `safeTrack`; observability errors do not affect exit code or output.
- **UX copy**: success output format `Logs for project "<name>" in <env>:\n<entries>`; log entries rendered as `<timestamp> [<level>] <message>`.

## [2.16.0] - 2026-04-09

### Phase 1 — Logs Command Trivial Prototype

- **`LogsClient` port** (`src/ports/logs-client.ts`): `getLogs(request): Promise<LogsResponse>`; request carries `manifest` and `environment`; response carries `name`, `environment`, and ordered log `entries`.
- **`LogsError`** (`src/errors/cli-errors.ts`): exit code 17; message includes project name and reason.
- **`StubLogsClient`** (`src/adapters/stub-logs-client.ts`): stateless adapter returning three deterministic entries (info/info/warn); sentinel name `logs-failure` rejects with `LogsError`.
- **`logs` command** (`src/cli.ts`): reads `platform.yaml` from `cwd` or optional directory; environment defaults to `preview`; exits 11/12/17 on error paths; exits 0 with project name, environment, and rendered log lines on success.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `StubLogsClient` exported as `logsClient` and wired into `runCli`.

## [2.15.0] - 2026-04-09

### Phases 1–3 — Rollback Command (Stub Adapter)

- **`RollbackClient` port** (`src/ports/rollback-client.ts`): `rollback(request): Promise<RollbackReceipt>`; request carries `manifest` and `targetEnvironment`; receipt carries `name`, `targetEnvironment`, and `rollbackId`.
- **`RollbackError`** (`src/errors/cli-errors.ts`): exit code 16; message includes project name and reason.
- **`StubRollbackClient`** (`src/adapters/stub-rollback-client.ts`): deterministic `stub-rollback-<name>-<target>-N` IDs; sentinel name `rollback-failure`; state resets on construction.
- **`rollback` command** (`src/cli.ts`): reads `platform.yaml` from `cwd` or optional directory; target environment defaults to `production`; too-many-args exit 1; invalid target exit 6; exits 11/12/16 on error paths; exits 0 with name/targetEnvironment/rollbackId on success; observability via `safeTrack` for start/success/failure.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `StubRollbackClient` exported as `rollbackClient` and wired into `runCli`.
- **Unit tests** (`src/adapters/stub-rollback-client.test.ts`): ID format, sequencing, independent counters, sentinel failure, instance isolation.
- **CLI integration tests** (`src/cli.test.ts`): 12 tests covering all success and error paths, observability, and argument validation.
- **E2E tests** (`src/rollback.e2e.test.ts`): create-then-rollback, repeated rollbacks, sentinel failure exit 16.
- **Container guard** (`src/container.test.ts`): asserts `rollbackClient` is an instance of `StubRollbackClient`.
- **Design docs**: `design/assumptions-register.md` rollback assumptions RLB-001–RLB-005 marked `validated`.

## [2.14.0] - 2026-04-09

### Phase 3 — Promote Test Coverage, Guardrails, and Documentation

- **`StubPromoteClient` unit tests** (`src/adapters/stub-promote-client.test.ts`): verify deterministic promotion ID format (`stub-promote-<name>-<target>-N`), incrementing sequence per project/target, independent counters across targets, sentinel failure raises `PromotionError`, and state isolation between instances.
- **CLI integration tests** (`src/cli.test.ts`): promote describe block with 11 tests covering exit 0, success output fields, cwd/directory reads, missing/invalid manifest exit codes 11/12, promotion error exit 15, excess args exit 1, invalid target environment exit 6, observability tracking for start/success/failure without masking exit codes.
- **E2E tests** (`src/promote.e2e.test.ts`): create-then-promote flow exits 0 with expected output; repeated promotes return incrementing promotion IDs; sentinel failure project exits 15.
- **Container guard** (`src/container.test.ts`): asserts `promoteClient` is an instance of `StubPromoteClient`.
- **Design docs**: `design/future-command-expansion.md` updated with `promote` in "Implemented Commands (Spike Mode)" table (v2.12.0); `design/assumptions-register.md` promote assumptions PRM-001–PRM-005 marked `validated`.

## [2.13.0] - 2026-04-09

### Phase 2 — Promote Behaviour Hardening

- **Argument validation** (`src/cli.ts`): `universe promote [directory] [target-environment]` — too many args returns exit 1 with usage guidance; unsupported target environment value (not `preview`/`production`) returns `UnsupportedCombinationError` (exit 6).
- **Observability** (`src/cli.ts`): `safeTrack` calls added for `promote.start`, `promote.success`, and `promote.failure`; tracking failures are swallowed and do not affect exit code or output.

## [2.12.0] - 2026-04-09

### Phase 1 — Promote Trivial Prototype

- **`PromoteClient` port** (`src/ports/promote-client.ts`): interface declaring `promote(request: PromoteRequest): Promise<PromoteReceipt>`; `PromoteRequest` carries `manifest` and `targetEnvironment`; `PromoteReceipt` carries `name`, `targetEnvironment`, and `promotionId`.
- **`PromotionError`** (`src/errors/cli-errors.ts`): exit code 15; message includes project name and reason.
- **`StubPromoteClient`** (`src/adapters/stub-promote-client.ts`): tracks per-project/target-environment promotion counts; returns `stub-promote-<name>-<target>-N` receipts; rejects with `PromotionError` for the sentinel name `promote-failure`; state resets on construction.
- **`promote` command** (`src/cli.ts`): removed from `DEFERRED_COMMANDS`; reads `platform.yaml` from `cwd` or an optional directory argument; target environment defaults to `production`; exits 0 with name/targetEnvironment/promotionId on success; exits 11/12/15 on error paths.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `StubPromoteClient` exported as `promoteClient` and wired into `runCli`.

## [2.11.0] - 2026-04-09

### Phase 3 — Deploy Test Coverage, Guardrails, and Documentation

- **`StubDeployClient` unit tests** (`src/adapters/stub-deploy-client.test.ts`): verify deterministic deployment ID format, incrementing sequence per project/environment, independent counters across environments, sentinel failure raises `DeploymentError`, and state isolation between instances.
- **CLI integration tests** (`src/cli.test.ts`): deploy describe block with 11 tests covering exit 0, success output fields, default environment, missing/invalid manifest exit codes 11/12, deployment error exit 14, excess args exit 1, invalid environment exit 6, and observability tracking for start/success/failure without masking exit codes.
- **E2E tests** (`src/deploy.e2e.test.ts`): create-then-deploy flow exits 0 with expected output; repeated deploys return incrementing deployment IDs; sentinel failure project exits 14.
- **Container guard** (`src/container.test.ts`): asserts `deployClient` is an instance of `StubDeployClient`.
- **Design docs**: `design/future-command-expansion.md` updated with "Implemented Commands (Spike Mode)" table listing `deploy` (v2.10.0); `design/assumptions-register.md` deploy assumptions DPL-001–DPL-005 marked `validated`.

## [2.10.0] - 2026-04-09

### Phase 2 — Deploy Behaviour Hardening

- **Argument validation** (`src/cli.ts`): `universe deploy [directory] [environment]` — too many args returns exit 1 with usage guidance; unsupported environment value (not `preview`/`production`) returns `UnsupportedCombinationError` (exit 6).
- **Observability** (`src/cli.ts`): `safeTrack` calls added for `deploy.start`, `deploy.success`, and `deploy.failure`; tracking failures are swallowed and do not affect exit code or output.

## [2.9.0] - 2026-04-09

### Phase 1 — Deploy Trivial Prototype

- **`DeployClient` port** (`src/ports/deploy-client.ts`): interface declaring `deploy(request: DeployRequest): Promise<DeployReceipt>`; `DeployRequest` carries `manifest` and `environment`; `DeployReceipt` carries `name`, `environment`, and `deploymentId`.
- **`DeploymentError`** (`src/errors/cli-errors.ts`): exit code 14; message includes project name and reason.
- **`StubDeployClient`** (`src/adapters/stub-deploy-client.ts`): tracks per-project/environment deploy counts; returns `stub-<name>-<env>-N` receipts; rejects with `DeploymentError` for the sentinel name `deploy-failure`; state resets on construction.
- **`deploy` command** (`src/cli.ts`): removed from `DEFERRED_COMMANDS`; reads `platform.yaml` from `cwd` or an optional directory argument; environment defaults to `preview`; exits 0 with name/environment/deploymentId on success; exits 11/12/14 on error paths.
- **Container wiring** (`src/container.ts`, `src/bin.ts`): `StubDeployClient` exported as `deployClient` and wired into `runCli`.

## [2.8.0] - 2026-04-09

### Phase 4 — `register` Command

- **`register` command** (`src/cli.ts`): removed from `DEFERRED_COMMANDS`; reads `platform.yaml` from `cwd` or an optional directory argument; validates via `PlatformManifestService.validateManifest`; submits to `RegistrationClient`; exits 0 with project name and registration ID on success; exits 11 for a missing manifest, 12 for an invalid manifest, 13 for a registration failure, and 1 for excess arguments.
- **`CliDependencies` extended** (`src/cli.ts`): added `projectReader` and `registrationClient` inline structural deps; extended `platformManifestGenerator` with `validateManifest`.
- **`bin.ts` wired** (`src/bin.ts`): `LocalProjectReader` and `StubRegistrationClient` (from container) passed as `projectReader` and `registrationClient`.
- **CLI unit tests** (`src/cli.test.ts`): added 8 register tests covering success, path resolution (cwd and directory arg), exit 11/12/13/1 failure paths; removed register from deferred-command tests.
- **E2E test** (`src/register.e2e.test.ts`): covers `create` → `register` happy path and duplicate-registration exit 13.

## [2.7.0] - 2026-04-09

### Phase 3 — `StubRegistrationClient` Adapter

- **`StubRegistrationClient`** (`src/adapters/stub-registration-client.ts`): implements `RegistrationClient`; tracks registered project names in memory; returns a deterministic receipt (`registrationId: stub-<name>`); rejects with `RegistrationError` on a second registration for the same name; state resets on construction.
- **Adapter tests** (`src/adapters/stub-registration-client.test.ts`): covers first registration receipt, static manifest success, duplicate-registration error, and per-instance state isolation.
- **Container wiring** (`src/container.ts`): `StubRegistrationClient` added as the `registrationClient` export; container guard test updated to assert the correct instance type.

## [2.6.0] - 2026-04-09

### Phase 2 — `ProjectReader` Adapter

- **`LocalProjectReader`** (`src/adapters/local-project-reader.ts`): implements `ProjectReaderPort`; reads files from the local filesystem via `fs/promises.readFile`; maps `ENOENT` to `ManifestNotFoundError` with the attempted path; all other errors propagate as-is.
- **Adapter tests** (`src/adapters/local-project-reader.test.ts`): covers file-exists success, missing-file throws `ManifestNotFoundError`, and path included in error message; uses a real temp directory.

## [2.5.0] - 2026-04-09

### Phase 1 — `register` Contract Definition

- **`ProjectReaderPort`** (`src/ports/project-reader.ts`): port interface declaring `readFile(filePath): Promise<string>`; throws `ManifestNotFoundError` on missing file.
- **`RegistrationClient`** (`src/ports/registration-client.ts`): port interface declaring `register(manifest): Promise<RegistrationReceipt>`; defines `RegistrationReceipt` type (`registrationId`, `name`); throws `RegistrationError` on failure.
- **Extended error taxonomy** (`src/errors/cli-errors.ts`): added `ManifestNotFoundError` (exit 11), `ManifestInvalidError` (exit 12), `RegistrationError` (exit 13) with actionable messages; exit codes added to `EXIT_CODES`; uniqueness test updated to cover all 13 error classes.

## [2.4.0] - 2026-04-09

### Phase 4 — `platform.yaml` Schema

- **Defined `PlatformManifest` types** ([src/services/platform-manifest-service.ts](src/services/platform-manifest-service.ts)): `AppPlatformManifest` and `StaticPlatformManifest` are inferred from Zod schemas using a discriminated union on `stack`; `schemaVersion` is a `z.literal("1")` field present on both shapes; schemas use only JSON-Schema-representable Zod constructs.
- **Refactored `PlatformManifestService.generatePlatformManifest`** ([src/services/platform-manifest-service.ts](src/services/platform-manifest-service.ts)): string template concatenation replaced by building a typed `PlatformManifest` object first, then serialising with `yaml.stringify`; `schemaVersion: "1"` and `stack` now appear in all generated `platform.yaml` files.
- **Added `PlatformManifestService.validateManifest`** ([src/services/platform-manifest-service.ts](src/services/platform-manifest-service.ts)): parses a YAML string with `yaml.parse`, then validates the in-memory object against `PlatformManifestSchema`; propagates `ZodError` on invalid input.
- **Validation unit tests** ([src/services/platform-manifest-service.test.ts](src/services/platform-manifest-service.test.ts)): added tests for valid app manifest, valid static manifest, missing required field, unrecognised `schemaVersion`, and JSON Schema export via `z.toJSONSchema(PlatformManifestSchema)`.
- **Updated snapshots** ([src/services/**snapshots**/platform-manifest-service.test.ts.snap](src/services/__snapshots__/platform-manifest-service.test.ts.snap), [src/**snapshots**/create.e2e.test.ts.snap](src/__snapshots__/create.e2e.test.ts.snap)): snapshot output updated to include `schemaVersion: "1"` and `stack` fields.

## [2.3.0] - 2026-04-09

### Phase 3 — Layer Templating

- **Defined template variable set and delimiter syntax** ([design/todo.md](design/todo.md)): variables are `{{name}}`, `{{runtime}}`, `{{framework}}`; simple `String.replaceAll` — no engine dependency; unknown placeholders pass through unchanged.
- **Implemented `LayerTemplateRenderer`** ([src/services/layer-template-renderer.ts](src/services/layer-template-renderer.ts)): internal service that accepts a template string and a typed context object and returns the rendered string.
- **Wired `LayerTemplateRenderer` into `LayerCompositionService`** ([src/services/layer-composition-service.ts](src/services/layer-composition-service.ts)): template rendering now happens inside `resolveLayers` after file composition; the default layer registry uses `{{name}}` in place of the old `__PROJECT_NAME__` sentinel.
- **Removed post-hoc `renderProjectFiles` from `cli.ts`** ([src/cli.ts](src/cli.ts)): the application layer no longer performs string substitution; resolved files are written directly.

## [2.2.0] - 2026-04-09

### Phase 2 — YAML Config Serialisation

- **YAML parse and serialise in `LayerCompositionService`** ([src/services/layer-composition-service.ts](src/services/layer-composition-service.ts)): `.yaml`/`.yml` config files are now parsed with the `yaml` library instead of `JSON.parse`, and `stringifyConfig` emits valid human-readable YAML for those paths; JSON round-trip behavior is unchanged.
- **YAML serialisation tests** ([src/services/layer-composition-service.test.ts](src/services/layer-composition-service.test.ts)): added four cases covering YAML-only merge, `.yml` merge, JSON-only round-trip preservation, and combined JSON+YAML layer resolution.

## [2.1.0] - 2026-04-09

### Phase 1 — E2E Test Strategy Refactor

- **Combination coverage at unit level** ([src/services/layer-composition-service.test.ts](src/services/layer-composition-service.test.ts)): added 65 parameterised tests covering every allowed runtime/framework/database/service combination; each asserts resolved layer names against a computed expectation using the default registry with no filesystem I/O.
- **Replaced exhaustive e2e power-set loop with smoke tests** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): removed the 65-combination loop and its helpers; added three representative e2e paths (Node.js + Express + all services, Node.js + no framework/services, Static) to keep integration coverage meaningful without CI cost.

## [2.0.0] - 2026-04-09

### Refactor Phase 5 — Simplify Composition and Contracts

- **Updated `CliDependencies` to use inline structural types for services** ([src/cli.ts](src/cli.ts)): replaced port interface imports (`CreateInputValidator`, `LayerResolver`, `PlatformManifestGenerator`) with minimal inline types that express only what the CLI needs from each service; `PromptPort`, `FilesystemWriter`, and `ObservabilityClient` remain as explicit port imports.
- **Removed port interface type annotations from CLI tests** ([src/cli.test.ts](src/cli.test.ts)): test doubles now carry explicit parameter types without referencing the deleted port interfaces; `ResolvedLayerSet` is imported from the service that owns it.
- **Deleted the three obsolete port interfaces** (`src/ports/create-input-validator.ts`, `src/ports/layer-resolver.ts`, `src/ports/platform-manifest-generator.ts`): only true external-boundary ports remain in `src/ports/`.

## [1.9.0] - 2026-04-09

### Refactor Phase 4 — Move `LocalPlatformManifestGenerator` into `src/services`

- **Created `PlatformManifestService`** ([src/services/platform-manifest-service.ts](src/services/platform-manifest-service.ts)): moved runtime-specific manifest construction out of `src/adapters/` into `src/services/` where pure application logic belongs.
- **Deleted `LocalPlatformManifestGenerator`** (`src/adapters/local-platform-manifest-generator.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point and E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites.
- **Aligned future manifest work** ([design/further-work/create.md](design/further-work/create.md), [design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `PlatformManifestGenerator` removed from port lists; `PlatformManifestService` recorded as internal service; schema validation and serialisation noted as service-level additions, not new adapter boundaries.

## [1.8.0] - 2026-04-09

### Refactor Phase 3 — Move `LocalLayerResolver` into `src/services`

- **Created `LayerCompositionService`** ([src/services/layer-composition-service.ts](src/services/layer-composition-service.ts)): moved layer ordering, conflict detection, config merging, and the default layer registry out of `src/adapters/` into `src/services/`; `ResolvedLayer` and `ResolvedLayerSet` types are now owned by this service.
- **Deleted `LocalLayerResolver`** (`src/adapters/local-layer-resolver.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point, E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites; `LayerRegistry` type also imported from the service.
- **Recorded layer registry as internal data** ([design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `LayerResolver` removed from port lists; `LayerCompositionService` recorded as an internal service that owns the registry; future template/serialisation work noted as extending the service, not adding a new adapter boundary.

## [1.7.0] - 2026-04-09

### Refactor Phase 2 — Move `DefaultCreateInputValidator` into `src/services`

- **Created `CreateInputValidationService`** ([src/services/create-input-validation-service.ts](src/services/create-input-validation-service.ts)): moved create-name rules and runtime/framework/services compatibility checks out of `src/adapters/` into `src/services/` where pure application logic belongs.
- **Deleted `DefaultCreateInputValidator`** (`src/adapters/default-create-input-validator.ts`): removed the misclassified adapter and its test; all coverage now lives alongside the service.
- **Updated entry point and E2E wiring** ([src/bin.ts](src/bin.ts), [src/create.e2e.test.ts](src/create.e2e.test.ts)): replaced adapter import with service import at all call sites.
- **Removed adapter framing from design docs** ([design/summary.md](design/summary.md), [design/prd.md](design/prd.md)): `CreateInputValidator` removed from port lists; `CreateInputValidationService` recorded as an internal service.

## [1.6.0] - 2026-04-09

### Refactor Phase 1 — Refactor Plan and Target Boundaries

- **Reclassified three misplaced adapters as internal services** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): documented that `DefaultCreateInputValidator`, `LocalLayerResolver`, and `LocalPlatformManifestGenerator` contain pure create-flow policy and belong in `src/services/`, not in `src/adapters/` behind port interfaces.
- **Fixed port boundary** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): confirmed that `PromptPort`, `FilesystemWriter`, and `ObservabilityClient` are the only true external boundaries; the three validator/resolver/generator port interfaces will be deleted.
- **Recorded migration strategy** ([plans/universe-cli/architecture.md](plans/universe-cli/architecture.md)): one-pass import updates per class with no compatibility re-exports; migration points identified as `src/bin.ts`, `src/cli.ts` (`CliDependencies`), and affected test files.

## [1.5.0] - 2026-04-08

### Phase 4 — Tests, Documentation, and Migration Notes

- **Expanded create E2E coverage** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added a matrix-wide `create` flow test so every allowed runtime/framework/services combination is exercised end-to-end and verified to scaffold successfully.
- **Locked scaffold output snapshots** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added explicit Node.js and Static generated-file snapshots to make artifact regressions visible as future adapters and templates evolve.
- **Added conflict behavior E2E checks** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): added end-to-end assertions for config merge overwrite behavior and non-config collision failures to protect deterministic layer-composition guarantees.
- **Covered remaining spike command flows** ([src/create.e2e.test.ts](src/create.e2e.test.ts)): validated all 8 deferred commands plus create validation/conflict failures in one integration-oriented suite to close the Phase 4 command-flow gate.
- **Documented create assumptions and unknowns** ([plans/universe-cli/assumptions-register.md](plans/universe-cli/assumptions-register.md)): tracked assumptions and open questions that arose implementing `universe create`.
- **Defined deferred-command migration notes** ([design/future-command-expansion.md](design/future-command-expansion.md)): documented how stubbed commands evolve from the shared deferred contract and what shared infrastructure can be reused when `register` is implemented.

## [1.4.0] - 2026-04-08

### Phase 3 — Layer Composition and Artifact Generation

- **Deterministic scaffold composition** ([src/adapters/local-layer-resolver.ts](src/adapters/local-layer-resolver.ts), [src/ports/layer-resolver.ts](src/ports/layer-resolver.ts)): added an explicit layer resolver so `create` now applies `always`, runtime, framework, and service layers in a stable order with typed failures for missing layers, same-stage collisions, and unsafe non-config overwrites.
- **Write-safe local scaffolding** ([src/adapters/local-filesystem-writer.ts](src/adapters/local-filesystem-writer.ts), [src/ports/filesystem-writer.ts](src/ports/filesystem-writer.ts), [src/cli.ts](src/cli.ts)): moved `create` from confirmation-only output to actual project generation so the spike proves end-to-end artifact writing while rolling back partial output on unrecoverable failures.
- **Starter artifact generation** ([src/adapters/local-layer-resolver.ts](src/adapters/local-layer-resolver.ts), [src/bin.ts](src/bin.ts)): locked in Node.js and Static starter files plus shared artifacts (`README.md`, `.gitignore`, `docker-compose.dev.yml`, `Procfile`) so the supported matrix now produces runnable local scaffolds instead of placeholders.
- **Platform manifest derivation** ([src/adapters/local-platform-manifest-generator.ts](src/adapters/local-platform-manifest-generator.ts), [src/ports/platform-manifest-generator.ts](src/ports/platform-manifest-generator.ts)): generated `platform.yaml` directly from `create` selections to make the spike validate ADR-aligned stack metadata, stable service ordering, and distinct app vs static shapes.
- **Phase 3 regression coverage** ([src/adapters/local-layer-resolver.test.ts](src/adapters/local-layer-resolver.test.ts), [src/adapters/local-filesystem-writer.test.ts](src/adapters/local-filesystem-writer.test.ts), [src/adapters/local-platform-manifest-generator.test.ts](src/adapters/local-platform-manifest-generator.test.ts), [src/cli.test.ts](src/cli.test.ts)): added focused tests so future phases can expand adapters without regressing deterministic composition, rollback behavior, or manifest output.

## [1.3.0] - 2026-04-08

### Phase 2 — `universe create` Prompt Flow and Validation

- **Interactive create UX** (`src/adapters/clack-prompt-adapter.ts`, `src/cli.ts`): replaced the deferred `create` stub with an interactive-only flow so the spike can validate onboarding behavior before scaffold generation is implemented.
- **Prompt contract + ordering** (`src/ports/prompt-port.ts`, `src/adapters/clack-prompt-adapter.test.ts`): codified the prompt port and enforced the exact Name → Runtime → Framework → Databases → Platform services → Confirmation sequence to keep downstream phases deterministic.
- **Runtime-aware options** (`src/adapters/clack-prompt-adapter.ts`): filtered framework and multi-select choices by runtime so unsupported paths are prevented at selection time, reducing invalid combinations before generation logic lands.
- **Typed input validation** (`src/ports/create-input-validator.ts`, `src/adapters/default-create-input-validator.ts`): added central validation for name rules, existing-target checks, `None` exclusivity, and supported matrix enforcement to produce stable, typed error behavior ahead of artifact writing.
- **Shared CLI error base class** (`src/errors/cli-errors.ts`, `src/cli.ts`): introduced `CliError` so command handling can rely on `instanceof` rather than structural `exitCode` checks, keeping typed CLI failures explicit as more commands are implemented.
- **Validation coverage in CLI and unit tests** (`src/cli.test.ts`, `src/adapters/default-create-input-validator.test.ts`): ensured actionable feedback reaches users and that phase-locked constraints are regression-tested.
- **Matrix and static convention locks** (`design/create-supported-matrix.md`, `design/static-scaffold-convention.md`): documented the reduced spike matrix and static serving contract explicitly to prevent scope drift while Phase 3 builds layer/artifact generation.

## [1.2.0] - 2026-04-08

### Phase 1 — Command Surface + Stub Contract

- **CLI routing** (`src/cli.ts`): `runCli(argv, observability)` dispatches all 9 ADR-007 commands. Returns a `CliResult` with exit code and output string.
- **Help text**: `universe --help` lists all 9 commands with descriptions.
- **Deferred command stubs**: `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, and `teardown` each exit non-zero and emit the standardized `DeferredCommandError` message.
- **CLI tests** (`src/cli.test.ts`): snapshot-verified help output; all 8 deferred commands verified to exit non-zero and contain their command name; standardized message format snapshot-locked.

## [1.1.0] - 2026-04-08

### Phase 0 — Foundations

- **Architecture note** (`plans/universe-cli/architecture.md`): documents hexagonal layer diagram, port interfaces, adapter contracts, test suite structure, and error exit code table.
- **Assumptions register** (`plans/universe-cli/assumptions-register.md`): captures spike-start assumptions, reduced-matrix decisions, and open questions.
- **Error taxonomy** (`src/errors/cli-errors.ts`): ten typed error classes (`InvalidNameError`, `TargetDirectoryExistsError`, `UnsupportedRuntimeError`, `UnsupportedFrameworkError`, `UnsupportedCombinationError`, `InvalidMultiSelectError`, `MissingLayerError`, `LayerConflictError`, `ScaffoldWriteError`, `DeferredCommandError`) each mapped to a unique exit code (1–10). Snapshot tests cover all message formats; exit-code uniqueness is verified in `cli-errors.test.ts`.
- **Standardized deferred-command contract**: `DeferredCommandError` carries a fixed message template and exit code used by all 8 non-`create` commands.
- **`ObservabilityClient` port** (`src/ports/observability-client.ts`): interface with `safeTrack` / `safeError` wrappers that swallow client errors to keep o11y best-effort.
- **`StubObservabilityClient` adapter** (`src/adapters/stub-observability-client.ts`): no-op spike implementation.
- **Spike container** (`src/container.ts`): wires stub adapters; guard test enforces that only stub classes are wired.
- **Quality gates**: scoped TypeScript `include` to `src/**/*`; 18 tests pass, lint and type-check are clean.
