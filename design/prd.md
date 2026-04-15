# PRD — Create Extensibility: Framework Layers + Package Manager Selection

## 1. Overview

### 1.1 Product Summary

Extend `universe create` so framework scaffolding is easier to expand over time and users can choose a package manager for Node.js projects (initially `pnpm` and `bun`) without leaking package-manager specifics into framework/runtime responsibilities.

### 1.2 Terminology

**Runtime** in this codebase refers to the outermost execution boundary of a project. This covers:

- Execution environments: Node.js, Python, bun-as-runtime, .NET CLR, V8/browser
- Compilation targets with no managed runtime: Rust, C, C++

TypeScript is explicitly **not** a runtime. It is a compile-time tool and devDependency that runs under Node.js. It is treated as a framework in this system (see FR-5).

The current runtime option `node_ts` is renamed to `node` to reflect that the runtime is Node.js alone. TypeScript support is selected independently via framework choice.

### 1.3 Problem and Opportunity

Current scaffolding couples concerns in ways that slow extension:

- runtime layer currently owns TypeScript, lifecycle scripts, and package-manager-specific files
- framework layer has limited room to own scaffold behavior
- package manager behavior appears in both templates and command orchestration

This increases change risk when adding new frameworks or package managers.

### 1.4 Goals and Non-Goals

#### Goals

- Rename `node_ts` runtime to `node`; introduce `frameworks/typescript` so TypeScript is selected as a framework, not baked into the runtime.
- Make framework layer support extensible without hardcoded per-framework branching.
- Add user-selectable package manager for Node.js (`pnpm`, `bun`) with room for future managers.
- Ensure scripts avoid direct package-manager references; use a generic `start.sh` script as the bridge between `docker-compose.dev.yml` and the chosen package manager.
- Preserve ports/adapters decoupling by introducing a single package manager service that encapsulates manager adapters.

#### Non-Goals

- Implement new concrete frameworks beyond `typescript` in this increment.
- Support package-manager selection for `static_web` runtime.
- Change behavior of non-`create` commands.

## 2. Users and Use Cases

### 2.1 Target Users

- Platform engineers extending `universe create` scaffolding.
- Internal developers creating new Node.js projects.

### 2.2 User Stories

| As a…              | I want to…                                                        | So that…                                         |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| platform engineer  | add new framework layers without editing multiple switches        | scaffold growth stays low-risk and predictable   |
| platform engineer  | keep package-manager specifics out of framework/runtime templates | framework logic remains portable                 |
| internal developer | choose `pnpm` or `bun` during Node.js create                      | my scaffold matches team tooling                 |
| platform engineer  | keep one package-manager dependency in command wiring             | dependency injection remains simple and testable |

## 3. Scope

### 3.1 In Scope

- Rename `node_ts` runtime to `node` throughout prompt, validation, layers, and tests.
- Introduce `frameworks/typescript` as a selectable framework layer for TypeScript-only Node projects.
- Extend create prompt/input model with Node-only package-manager choice.
- Validate package-manager compatibility by runtime.
- Add package-manager-aware layer resolution stage.
- Repartition layer ownership: runtime vs framework vs package-manager layers.
- Introduce `start.sh` as a PM-owned bridge script for `docker-compose.dev.yml`.
- Introduce package manager service abstraction over manager-specific adapters.
- Update tests and snapshots for new behavior.

### 3.2 Out of Scope

- New runtime options beyond renaming `node_ts` → `node`.
- Additional package managers beyond `pnpm` and `bun`.
- End-user migration tooling for existing generated projects.

## 4. Functional Requirements

- FR-1: Create input contract includes package manager for Node runtime only; runtime renamed to `node`.
  - Rationale: package-manager choice is a first-class create decision; runtime naming must reflect what actually executes.
  - Acceptance Criteria:
    - `RUNTIME_OPTIONS` value changes from `node_ts` to `node`; label remains "Node.js (TypeScript)" until framework selection replaces the TypeScript assumption.
    - Framework options include `typescript` (TypeScript, no web framework), `express`, and `none`.
    - Prompt flow includes package-manager selection when runtime is `node`.
    - Prompt flow does not request package manager when runtime is `static_web`.
    - Confirmation output includes package manager for Node selections.
    - Input model supports values `pnpm` and `bun` for Node.

- FR-2: Validation enforces runtime/framework/package-manager compatibility.
  - Rationale: invalid combinations must fail before writing files.
  - Acceptance Criteria:
    - `node` runtime selections require a supported package manager (`pnpm` or `bun`).
    - `static_web` selections reject non-empty package-manager choice.
    - `static_web` selections reject framework choices that require Node (`typescript`, `express`).
    - Invalid combinations return typed create validation errors.

- FR-3: Layer resolution supports package-manager stage and framework extensibility.
  - Rationale: layering must scale without hardcoded framework logic.
  - Acceptance Criteria:
    - Resolution order is deterministic: `always` → `base/{runtime}` → `package-managers/{manager}` (Node only) → `frameworks/{framework}` → `services/{service}`.
    - Static resolution omits package-manager stage.
    - Framework resolution is data-driven/registry-oriented (no framework-specific branching required for future additions).
    - Missing/invalid layers fail with existing typed layer errors.

- FR-4: Runtime layer owns only execution-environment primitives.
  - Rationale: the `node` runtime layer should contain only what is true of Node.js regardless of language, framework, or package manager. `docker-compose.dev.yml` stays here but is made PM-agnostic via a bridge script.
  - Acceptance Criteria:
    - Base layer is renamed from `base/node-js-typescript` to `base/node`.
    - `base/node` contains: `Procfile`, `docker-compose.dev.yml` (command: `sh start.sh`).
    - `base/node` excludes TypeScript, `tsconfig.json`, `src/index.ts`, and all lifecycle scripts.
    - `docker-compose.dev.yml` calls `sh start.sh` so it has no knowledge of the package manager.

- FR-5: TypeScript is modeled as a framework; framework layers own language tooling, entry points, and PM-agnostic scripts.
  - Rationale: TypeScript is a compile-time tool (devDependency), not a runtime. Treating it as a framework makes the selection explicit, keeps the runtime layer clean, and opens the door to non-TypeScript Node.js projects in future.
  - Acceptance Criteria:
    - `frameworks/typescript` is introduced and contributes: TypeScript devDependency, `tsconfig.json`, `src/index.ts` (minimal TS HTTP server), `build: "tsc -p tsconfig.json"` script, `start: "node dist/index.js"` script.
    - `frameworks/express` contributes: express dependency, TypeScript devDependency, express-specific `src/index.ts`, `build` and `start` scripts matching the TypeScript pattern.
    - `frameworks/none` contributes nothing (bare Node.js, no TypeScript, no scripts).
    - No framework layer includes `dev`, `preinstall`, or `start.sh` (those are PM-specific, owned by FR-6).
    - Scaffold outputs remain deterministic per selection tuple.

- FR-6: Package-manager layers own manager-specific scaffold artifacts including the `start.sh` bridge script.
  - Rationale: `docker-compose.dev.yml` must be stable and PM-agnostic (owned by the runtime layer); `start.sh` is the single PM-specific seam that the compose file calls.
  - Acceptance Criteria:
    - `package-managers/pnpm` layer contributes: `pnpm-workspace.yaml`, `start.sh` (`pnpm install && pnpm dev`), `dev: "pnpm run build && pnpm run start"` script, `preinstall: "npx only-allow pnpm"` script.
    - `package-managers/bun` layer contributes: `start.sh` (`bun install && bun dev`), `dev: "bun run build && bun run start"` script (no preinstall hook in v1).
    - Node+pnpm and Node+bun produce distinct PM artifacts from their respective layers.
    - Static scaffolds include no Node package-manager artifacts.

- FR-7: Create orchestration uses a single package manager service.
  - Rationale: preserve DI simplicity while supporting multiple managers.
  - Acceptance Criteria:
    - `handleCreate` depends on one service abstraction, not multiple manager adapters.
    - Service chooses internal manager adapter from validated user input.
    - Service executes dependency specification and install steps for Node runtime.
    - Static runtime path skips package-manager execution.

- FR-8: Test suite covers new behavior and preserves deterministic output.
  - Rationale: architecture changes require strong regression safety.
  - Acceptance Criteria:
    - Unit tests updated for prompt flow, validation rules, layer ordering, manager service dispatch, and adapters.
    - Integration create tests cover Node+pnpm, Node+bun, Static.
    - Snapshot and behavior tests remain deterministic across supported combinations.

## 5. Non-Functional Requirements

- NFR-1: Existing supported create combinations continue to work under renamed selections.
  - Acceptance Criteria:
    - Node+Express scaffold succeeds as `node` + `express` + `pnpm` (was `node_ts` + `express`).
    - The former Node+None (TypeScript, no web framework) scaffold succeeds as `node` + `typescript` + `pnpm`.
    - Static scaffolds continue to succeed without manager selection.
    - Scaffold file output for equivalent selections is identical to the pre-refactor output.

- NFR-2: Extensibility for future frameworks/package managers.
  - Acceptance Criteria:
    - Adding one new framework or package manager requires adding new layer/adapter entries and tests, without modifying command handler control flow.

- NFR-3: Deterministic scaffold output.
  - Acceptance Criteria:
    - Same selection tuple always produces identical file set/content ordering.

## 6. Dependencies and Assumptions

### 6.1 Dependencies

- Existing create architecture (`Prompt`, validation service, layer composition service, command handler).
- Existing package manager adapter pattern and error taxonomy.

### 6.2 Assumptions

- `bun` adapter can be implemented using available local CLI commands in development environments.
- TypeScript is not a runtime; it is modeled as a framework (`frameworks/typescript`) and is not present in the base runtime layer or any PM layer.
- `frameworks/express` declares its own TypeScript devDependency because Express projects in this system are always TypeScript-based.
- Bun dependency pinning matches pnpm semantics: versions are resolved by running `bun install --frozen-lockfile` equivalent and extracted via `bun list --json`, then pinned in `package.json`.
- `docker-compose.dev.yml` is stable and owned by the runtime layer; it calls `sh start.sh` as the only PM-specific seam.
- Framework layers own PM-agnostic scripts only (`build`, `start`); PM-specific scripts (`dev`, `preinstall`) and `start.sh` are always contributed by the package-manager layer.

## 7. Risks and Mitigations

- Risk: Layer repartition causes broad snapshot churn.
  - Mitigation: phase changes and update tests in lock-step with deterministic ordering checks.
- Risk: Script portability differs between package managers.
  - Mitigation: enforce “no manager literal references where possible” and document exceptions in tests.
- Risk: Adapter dispatch logic drifts from validation contract.
  - Mitigation: centralize manager mapping in service and cover with unit tests.

## 8. Milestones

- Milestone 1: Input/validation + service contract updates.
- Milestone 2: Layer repartition + package-manager stage integration.
- Milestone 3: Adapter/service wiring + full test stabilization.

## 9. Resolved Design Decisions

- **Runtime rename**: `node_ts` → `node`. The runtime is Node.js. TypeScript is a framework, not a runtime.
- **TypeScript as a framework**: `frameworks/typescript` is introduced as the framework choice for TypeScript projects without a web framework. `frameworks/express` includes its own TypeScript devDependency because all Express projects here are TypeScript-based. `frameworks/none` is bare Node.js with no TypeScript.
- **`docker-compose.dev.yml` ownership and PM isolation**: The compose file lives in `base/node` and is stable across PM choices. It calls `sh start.sh`. Each PM layer contributes `start.sh` with its own install+dev command. This prevents shared ownership of the compose file without PM-specific content.
- **Bun pinning semantics**: Bun matches pnpm exactly. Versions are defined by `package.json`; `bun install --frozen-lockfile` resolves the lockfile; `bun list --json` extracts installed versions for pinning.
- **PM-specific scripts**: `dev` and `preinstall` scripts are PM-specific and contributed by the PM layer. The `preinstall` hook enforces manager exclusivity where applicable (pnpm: `npx only-allow pnpm`; bun: no enforcement hook in v1). The `dev` script invokes the PM's run command.

## 10. Accepted Selection Tuples (Phase 1 Increment)

All valid combinations enforced by `CreateInputValidationService`:

| Runtime      | Framework    | Package Manager | Notes                                  |
| ------------ | ------------ | --------------- | -------------------------------------- |
| `node`       | `typescript` | `pnpm`          | TypeScript-only Node project with pnpm |
| `node`       | `typescript` | `bun`           | TypeScript-only Node project with bun  |
| `node`       | `express`    | `pnpm`          | Express + TypeScript with pnpm         |
| `node`       | `express`    | `bun`           | Express + TypeScript with bun          |
| `node`       | `none`       | `pnpm`          | Bare Node.js (no TypeScript) with pnpm |
| `node`       | `none`       | `bun`           | Bare Node.js (no TypeScript) with bun  |
| `static_web` | `none`       | (none)          | Static HTML/CSS/JS, no package manager |
