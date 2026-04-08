# PRD — Universe CLI Spike (Create-First, Stub-First)

## 1) Overview

Build a stub-first prototype of the `universe` CLI that preserves the 9-command ADR-007 surface while fully implementing only `universe create`. The spike validates the most important local workflow first: interactive scaffolding, deterministic template composition, generated project artifacts, and a clean contract for future command expansion.

## 2) Users

- **Primary:** Platform engineers designing and validating CLI architecture.
- **Secondary:** Early internal developers evaluating command ergonomics.

## 3) User Stories

| As a…              | I want to…                                                  | So that…                                                                 |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| platform engineer  | expose all CLI commands locally against deterministic stubs | I can validate the public command surface before platform services exist |
| platform engineer  | implement `universe create` first with tests and contracts  | I can reduce risk and validate the highest-value workflow early          |
| platform engineer  | swap stubbed infrastructure for real adapters later         | I can migrate with minimal command-layer rewrites                        |
| internal developer | use `universe create` to scaffold a constellation locally   | I can experience intended onboarding UX early                            |
| platform engineer  | reject unsupported combinations clearly                     | I can keep the spike small without confusing users                       |

## 4) Functional Requirements

### FR-1 Public Command Surface

Expose all commands defined in ADR-007:

- `create`, `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, `teardown`.

**Acceptance Criteria**

- Running `universe --help` shows all 9 commands.
- Each non-`create` command is invocable and returns the same standardized “not implemented in spike” error contract.
- The standardized non-implemented contract defines one exact message template and one exact exit code shared by all 8 deferred commands.

### FR-2 `create` Local Scaffolding Flow

`create` must implement the local half of ADR-007’s two-step creation flow.

**Acceptance Criteria**

- `create` scaffolds files locally and exits without platform state changes.
- `create` is interactive-only in this spike.
- Successful execution ends with a clear local success message.

### FR-3 `create` Prompt Model

`create` must prompt for the key ADR-007 inputs needed for local scaffolding.

**Acceptance Criteria**

- Prompts collect: name, runtime, framework, databases, platform services.
- Prompt order is deterministic and optimized for interactive use.
- Invalid selections receive actionable feedback.

**Prompt Contract**

`universe create` uses this prompt order:

1. Name
2. Runtime
3. Framework
4. Databases
5. Platform services
6. Confirmation

**Acceptance Criteria**

- `Name` is required and validated before scaffolding.
- `Name` must be lowercase kebab-case, start with a letter, and be 3–50 characters long.
- `Framework` options are filtered by the selected runtime.
- `Databases` and `Platform services` are multi-select prompts.
- `None` is explicit and excludes all other choices in the same multi-select group.
- A final confirmation screen summarizes selected values before files are written.

### FR-4 Curated Supported Matrix

The spike must support only a curated subset of ADR-007 combinations.

| Runtime                                                    | Framework              | Databases               | Platform services            | Status               |
| ---------------------------------------------------------- | ---------------------- | ----------------------- | ---------------------------- | -------------------- |
| Node.js (TypeScript)                                       | Express                | PostgreSQL, Redis, None | Auth, Email, Analytics, None | supported            |
| Node.js (TypeScript)                                       | None                   | PostgreSQL, Redis, None | Auth, Email, Analytics, None | supported            |
| Static                                                     | None                   | None only               | None only                    | supported            |
| Static                                                     | None                   | PostgreSQL or Redis     | any                          | invalid              |
| Static                                                     | any non-None framework | any                     | any                          | invalid              |
| Python, Go, Next.js, Fastify, Hono, Flask, MongoDB, SQLite | any                    | any                     | any                          | unsupported in spike |

**Acceptance Criteria**

- Supported runtimes: Node.js (TypeScript), Static.
- Supported frameworks: Express or None for Node.js; None for Static.
- Supported databases: PostgreSQL, Redis, None.
- Supported platform services: Auth, Email, Analytics.
- Unsupported combinations fail with a clear unsupported-in-spike error.
- Invalid combinations fail before any files are written.
- Static scaffolds do not allow database selection beyond `None` in this spike.
- Static scaffolds do not allow platform services in this spike.
- E2E tests execute every allowed runtime/framework/services combination in spike scope and verify a project directory is created for each successful flow.

### FR-5 Generated Artifacts

`create` must generate a usable local starter from composed layers.

**Acceptance Criteria**

- Generates a project folder with starter source files.
- Generates `platform.yaml`, `README.md`, `docker-compose.dev.yml`, `Procfile`, and `.gitignore`.
- Every supported scaffold, including `Static`, includes `docker-compose.dev.yml` to preserve a unified developer experience.
- Generated artifacts are deterministic for the same selections.

**Per-runtime artifact contract**

For Node.js (TypeScript) scaffolds, generated files must include:

- `src/index.ts`
- `package.json`
- `tsconfig.json`
- `platform.yaml`
- `README.md`
- `docker-compose.dev.yml`
- `Procfile`
- `.gitignore`

For Static scaffolds, generated files must include:

- `public/index.html`
- `public/styles.css`
- `public/main.js`
- `platform.yaml`
- `README.md`
- `docker-compose.dev.yml`
- `Procfile`
- `.gitignore`

**Acceptance Criteria**

- No required file is omitted for any supported scaffold.
- Starter files are usable without requiring platform registration.

### FR-5a Static Scaffold Shape

Static scaffolds must use a simple, explicit local-serving model.

**Acceptance Criteria**

- Static starter files are written under `public/`.
- Static scaffolds use `serve` as the local webserver for this spike.
- Static `docker-compose.dev.yml` runs `serve` against `public/`.
- Static `Procfile` starts `serve` against `public/`.

### FR-6 `platform.yaml` Generation

`create` must derive `platform.yaml` from user selections using ADR-007 terminology.

**Acceptance Criteria**

- `platform.yaml` includes app name and selected services.
- Service names match developer-facing ADR-007 terminology.
- Static selections produce the appropriate static-oriented shape when needed.

For app stacks, `platform.yaml` includes:

- `name`
- `owner`
- `domain.production`
- `domain.preview`
- `environments.preview`
- `environments.production`
- `services`
- `resources`

For static stacks, `platform.yaml` includes:

- `name`
- `stack: static`
- `domain.production`
- `domain.preview`
- `environments.preview`
- `environments.production`

Additional rules:

- Selected services appear in stable order.
- Omitted sections are intentional and consistent across runs.

### FR-7 Layer Composition and Validation

The scaffold must be assembled from explicit layers and fail safely when composition is invalid.

**Acceptance Criteria**

- Layer composition in spike mode follows `always/` + `base/{runtime}` + `frameworks/{framework}` + `services/{each}`.
- Invalid names, existing target directory, invalid combinations, and missing layers use typed errors.
- No partial output is left behind after unrecoverable composition failures.

**Composition rules**

Layer resolution order is:

1. `always/`
2. `base/{runtime}`
3. `frameworks/{framework}`
4. `services/{each}` in stable sorted order

**Acceptance Criteria**

- The same selections always resolve to the same ordered layer set.
- Only configuration files are merged across layers in this spike.
- Configuration merge is additive by default: later layers add missing keys and preserve existing keys unless the same key is explicitly redefined.
- On direct key conflict in configuration files, later layers in resolution order overwrite earlier values.
- Any non-configuration file path collision aborts generation with a typed conflict error before writing output.
- Conflicts introduced within the same layer stage (for example, incompatible definitions from multiple selections in that stage) abort generation with a typed conflict error.
- Missing required layers abort generation with a typed error.

### FR-8 Stub-Only Architecture

All external concerns must remain behind interfaces fulfilled by stubs or local adapters.

**Acceptance Criteria**

- No command/test performs external network calls.
- Static analysis/test guard fails if non-stub adapter is used in spike mode.
- Non-`create` commands do not simulate deeper platform workflows in this spike.

### FR-9 Error Taxonomy and UX

Common errors must be normalized and user-friendly.

**Acceptance Criteria**

- Commands emit consistent error messages and exit codes by error category.
- The 8 stubbed commands share one standardized non-implemented error contract.
- Snapshot/golden tests validate key UX outputs.

**Error categories**

- `InvalidNameError`
- `TargetDirectoryExistsError`
- `UnsupportedRuntimeError`
- `UnsupportedFrameworkError`
- `UnsupportedCombinationError`
- `InvalidMultiSelectError`
- `MissingLayerError`
- `LayerConflictError`
- `ScaffoldWriteError`
- `DeferredCommandError`

**Acceptance Criteria**

- Each error category maps to one consistent user-facing message style.
- Each error category maps to one consistent exit behavior.
- All 8 deferred commands use `DeferredCommandError`.
- `DeferredCommandError` uses one exact message template and one exact exit code across all 8 deferred commands.
- Validation failures are actionable and identify the rejected input.

**Configuration merge scope (Spike)**

Configuration merging applies only to files with these extensions: `.json`, `.yaml`, `.yml`.

### FR-10 Contract-Driven Adapter Design

Define explicit ports for the boundaries needed by this spike, with contract tests that each stub/local adapter must satisfy.

**Acceptance Criteria**

- Template/layer resolution and filesystem writing ports have interface docs + behavior expectations.
- Contract test suite passes for all spike adapters.

**Required spike ports**

- `PromptPort`
- `CreateInputValidator`
- `LayerResolver`
- `FilesystemWriter`
- `PlatformManifestGenerator`
- `ObservabilityClient`

**Acceptance Criteria**

- Each port has documented inputs, outputs, and normalized error behavior.
- Contract tests exist for `PromptPort`, `CreateInputValidator`, `LayerResolver`, `FilesystemWriter`, `PlatformManifestGenerator`, and `ObservabilityClient`.
- Deferred commands do not introduce extra platform lifecycle ports in this spike.

### FR-11 Migration Path Readiness

Maintain assumptions-first migration notes from the `create` spike to later command implementation.

**Acceptance Criteria**

- A shared assumptions register exists and is updated for the create-first phases.
- Documentation includes: current assumptions, unknowns, required future adapter/provider capabilities, and matrix-expansion triggers.
- Migration notes explain how future commands will replace stub-only behavior.

## 5) Non-Functional Requirements

- Deterministic local tests (no flaky timing/network assumptions).
- Fast feedback: unit tests should complete quickly in local development.
- Reproducibility: fresh clone + install can run prototype and tests with minimal setup.
- Observability integration is deferred until after the spike; spike only requires an o11y client interface with stub/no-op implementation.

### Observability Guardrails (Spike)

- Provide a minimal `ObservabilityClient` port and a default stub/no-op adapter for all spike commands.
- Do not integrate real o11y backends (ClickHouse, Vector, HyperDX, GlitchTip, VictoriaMetrics) during the spike.
- Keep command handlers vendor-agnostic by routing any future telemetry through one shared command runner/wrapper boundary.
- Keep o11y non-blocking: failures in the o11y client must never fail command execution.
- Do not couple tests to vendor payload shapes; tests should validate command behavior and stub o11y interactions only.
- Never emit secrets/PII (tokens, raw env values, credentials) in any o11y payload.

## 6) Out of Scope

- Real GitHub org/repo automation.
- Real DNS, OIDC, SES, or database provisioning.
- Real CI/CD integration with Woodpecker/ArgoCD/Windmill.
- Real observability backend integration (shipping to ClickHouse/HyperDX/GlitchTip/VictoriaMetrics).
- Full implementation of `register`, `deploy`, `promote`, `rollback`, `logs`, `status`, `list`, or `teardown`.
- Non-interactive `create` mode.
- Full ADR-007 runtime/framework/database matrix.
- Production SLAs, full RBAC/SSO implementation.

## 7) Dependencies and Assumptions

- ADR-007 remains source of truth for command intent and UX language.
- Interface designs can evolve but must preserve command-level contracts.
- Interactive scaffolding is sufficient to validate the first vertical slice.

## 8) Release / Milestones

- **M1:** Architecture skeleton + shared stub-command contract + assumptions register
- **M2:** `create` prompt flow + validation + supported matrix
- **M3:** Layer composition + artifact generation + `platform.yaml`
- **M4:** Tests, docs, and migration notes for future command expansion

## 9) Risks and Mitigations

- **Risk:** Real APIs diverge from stub assumptions.
  - **Mitigation:** Contract-first ports + migration checklists + parity tests.
- **Risk:** Reduced matrix omits a path later judged essential.
  - **Mitigation:** Make unsupported paths explicit and document expansion triggers.
- **Risk:** UX inconsistency across commands.
  - **Mitigation:** Shared command output guidelines + snapshot tests.
