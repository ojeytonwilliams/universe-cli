# Universe CLI Spike — Assumptions Register

Use this register throughout the spike. Update it at the end of each phase.

## How to use

- Record both **current assumptions** (known at phase start) and **new assumptions** discovered during implementation.
- Keep assumptions tied to command groups and specific ports/adapters.
- For each assumption, include a concrete validation plan and status.
- If an assumption is invalidated, record impact and required follow-up changes.

## Status Legend

- `open` — not yet validated
- `validated` — confirmed by evidence
- `invalidated` — disproven and needs plan update
- `deferred` — intentionally postponed beyond spike

---

## Global Assumptions (Spike-Wide)

| ID     | Assumption                                                                                                           | Why Needed                                                                               | Validation Plan                                                                                       | Status | Notes                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| GA-001 | Platform/provider interfaces are not yet finalized                                                                   | Spike uses CLI-owned ports and stubs                                                     | Reconcile against real interface docs when available                                                  | open   |                                                              |
| GA-002 | Stub-only execution is sufficient to validate CLI UX and architecture                                                | Avoid coupling to missing platform systems                                               | Verify all tests run without network and without real adapters                                        | open   |                                                              |
| GA-003 | Observability backend integration is deferred post-spike                                                             | Keep spike scope focused                                                                 | Confirm only `ObservabilityClient` stub/no-op is used in spike code/tests                             | open   |                                                              |
| GA-004 | The spike should preserve the 9-command public surface even though only `create` is implemented                      | Reduce scope without hiding intended product shape                                       | Verify CLI help and stubbed-command tests cover all ADR-007 commands                                  | open   |                                                              |
| GA-005 | Interactive-only `create` is enough for the first spike                                                              | Lowest-risk way to validate UX and layer composition                                     | Revisit after prompt-flow and artifact-generation tests are stable                                    | open   |                                                              |
| GA-006 | A curated matrix is preferable to partial support across the full ADR-007 matrix                                     | Keeps the spike small and internally consistent                                          | Reassess after documenting unsupported-path friction and future expansion triggers                    | open   |                                                              |
| GA-007 | Static projects in this spike should be purely local asset bundles with no databases or platform services            | Keeps the Static path minimal and unambiguous                                            | Validate via prompt validation and generated artifact tests                                           | open   |                                                              |
| GA-008 | Spike composition order is `always` → `base` → `frameworks` → `services` even though ADR-007 lists a different order | Supports clear baseline defaults with deterministic late overrides for selected features | Validate through layer resolver contract tests and snapshot outputs; revisit when moving beyond spike | open   | Record as intentional spike-specific divergence from ADR-007 |
| GA-009 | E2E coverage should execute every allowed runtime/framework/services combination and verify project-folder creation  | Ensures supported matrix paths remain valid and catches composition regressions early    | Validate with matrix-driven e2e test suite and expected-combination count checks                      | open   | Applies to create success paths in spike scope               |

---

## Command Group — Shared Command Surface + Deferred Contract

### Current assumptions

| ID      | Port/Area      | Assumption                                                                        | Why Needed                                                    | Validation Plan                                             | Status | Notes |
| ------- | -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------ | ----- |
| CMD-001 | command router | All 9 commands should remain visible in help and routing                          | Preserves ADR-007 surface while reducing implementation scope | Validate with CLI help and smoke tests                      | open   |       |
| CMD-002 | error contract | One shared non-implemented error contract is sufficient for all deferred commands | Avoids inventing premature command-specific behavior          | Validate with snapshot tests across all 8 deferred commands | open   |       |

#### Unknowns

| ID      | Port/Area  | Unknown                                                               | Risk if Wrong | Decision Needed By                      | Owner    | Notes |
| ------- | ---------- | --------------------------------------------------------------------- | ------------- | --------------------------------------- | -------- | ----- |
| CMD-U01 | exit codes | Whether future commands will need differentiated temporary exit codes | Low           | Before expanding first deferred command | platform |       |

#### Required adapter/provider capabilities

| ID      | Port/Area      | Required capability (CLI-owned contract)         | Source command behavior   | Priority  | Notes                    |
| ------- | -------------- | ------------------------------------------------ | ------------------------- | --------- | ------------------------ |
| CMD-C01 | command runner | `runDeferredCommand(name) -> standardized error` | Deferred command behavior | must-have | Shared across 8 commands |

#### New assumptions discovered during implementation

| ID  | Port/Area | New assumption | Trigger/Context | Validation Plan | Status | Notes |
| --- | --------- | -------------- | --------------- | --------------- | ------ | ----- |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior:
- Affected ports/adapters:
- Required TODO/PRD changes:

---

## Command — `create`

### Current assumptions

| ID      | Port/Area           | Assumption                                                                                                 | Why Needed                                                       | Validation Plan                                                       | Status | Notes |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | ------ | ----- |
| CRT-001 | prompt flow         | ADR-007 prompt order is sufficient for the spike UX                                                        | Avoids redesigning the flow before validating basics             | Validate with CLI prompt tests and review of user friction            | open   |       |
| CRT-002 | supported matrix    | Node.js (TypeScript) + Express/None and Static + None provide enough coverage for the spike                | Balances realism and scope control                               | Validate with generated artifact review and follow-up scope review    | open   |       |
| CRT-003 | service set         | PostgreSQL, Redis, Auth, Email, and Analytics are enough to validate additive layer composition            | Exercises multi-select scaffolding without full matrix sprawl    | Validate with layer composition tests                                 | open   |       |
| CRT-004 | unified DX          | Every supported scaffold, including `Static`, should ship with `docker-compose.dev.yml`                    | Keeps local development workflow consistent across project types | Validate by checking artifact generation for every supported scaffold | open   |       |
| CRT-005 | prompt confirmation | A confirmation step before writes is sufficient to prevent accidental scaffold creation                    | Keeps create flow safe without adding rollback UX complexity     | Validate with CLI prompt tests                                        | open   |       |
| CRT-006 | name rules          | Lowercase kebab-case, starting with a letter, and 3–50 chars is a sufficient naming contract for the spike | Keeps generated folders and metadata predictable                 | Validate with unit tests for valid and invalid examples               | open   |       |

#### Unknowns

| ID  | Port/Area | Unknown | Risk if Wrong | Decision Needed By | Owner | Notes |
| --- | --------- | ------- | ------------- | ------------------ | ----- | ----- |

#### Required adapter/provider capabilities

| ID      | Port/Area          | Required capability (CLI-owned contract)                                    | Source command behavior   | Priority  | Notes |
| ------- | ------------------ | --------------------------------------------------------------------------- | ------------------------- | --------- | ----- |
| CRT-C01 | prompt port        | `promptForCreateInputs() -> createSelections` including confirmation result | Interactive `create` flow | must-have |       |
| CRT-C02 | validation service | `validateCreateInput(input) -> normalized result/errors`                    | Input validation          | must-have |       |

#### New assumptions discovered during implementation

| ID  | Port/Area | New assumption | Trigger/Context | Validation Plan | Status | Notes |
| --- | --------- | -------------- | --------------- | --------------- | ------ | ----- |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior:
- Affected ports/adapters:
- Required TODO/PRD changes:

---

## Command — `create` Supporting Services

### Current assumptions

| ID      | Port/Area                 | Assumption                                                                                                                                      | Why Needed                                                          | Validation Plan                                                                    | Status | Notes                                                                                                  |
| ------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| CRS-001 | layer model               | ADR-007 layer structure can be implemented directly in the spike without introducing a different abstraction                                    | Keeps spike aligned with target architecture                        | Validate by mapping supported matrix to one deterministic layer path per selection | open   |                                                                                                        |
| CRS-002 | artifact set              | Every supported scaffold should emit `platform.yaml`, `README.md`, `docker-compose.dev.yml`, `Procfile`, and `.gitignore`                       | Keeps artifacts consistent across the reduced matrix                | Validate via artifact-generation tests for each supported path                     | open   |                                                                                                        |
| CRS-003 | write safety              | The filesystem adapter can prevent partial output on unrecoverable failures                                                                     | Avoids broken starter projects                                      | Validate with failure-path tests                                                   | open   |                                                                                                        |
| CRS-004 | static layout             | Static scaffolds should place HTML/CSS/JS files in `public/` and use a simple webserver such as `serve`                                         | Defines one clear and testable Static convention for the spike      | Validate with static artifact-generation tests and template review                 | open   |                                                                                                        |
| CRS-005 | deterministic composition | Layer order and file collision behavior can be defined deterministically for the spike                                                          | Keeps output stable and testable                                    | Validate with repeated-generation and collision tests                              | open   |                                                                                                        |
| CRS-006 | collision policy          | Only configuration files should merge; any non-config collision should fail with typed error; same-stage conflicts should fail with typed error | Keeps merge behavior explicit and prevents unsafe silent overwrites | Validate with conflict-focused unit/contract/e2e tests                             | open   | Config merge limited to `.json`, `.yaml`, `.yml` in spike; later layers overwrite direct key conflicts |

#### Unknowns

| ID      | Port/Area               | Unknown                                                                                                                                             | Risk if Wrong | Decision Needed By                      | Owner    | Notes                                                                                |
| ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| CRS-U01 | static server packaging | Whether `serve` should be provided through project dependencies, container image defaults, or another packaging path in the eventual implementation | Low           | Before final template content is locked | platform | Server choice is locked for planning; packaging can be decided during implementation |

#### Required adapter/provider capabilities

| ID      | Port/Area                   | Required capability (CLI-owned contract)                                                         | Source command behavior            | Priority  | Notes                                            |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | --------- | ------------------------------------------------ |
| CRS-C01 | layer resolver              | `resolveLayers(input) -> orderedLayerSet` with normalized errors                                 | Deterministic scaffold composition | must-have |                                                  |
| CRS-C02 | filesystem writer           | `writeProject(targetDir, files)` with rollback-on-failure semantics                              | Artifact generation                | must-have |                                                  |
| CRS-C03 | platform manifest generator | `generatePlatformYaml(input) -> text`                                                            | `platform.yaml` output             | must-have | Uses ADR-007 naming                              |
| CRS-C04 | filesystem writer           | `writeProject(targetDir, files)` must detect collisions and fail cleanly on unrecoverable writes | Artifact generation safety         | must-have | Explicitly part of deterministic output contract |

#### New assumptions discovered during implementation

| ID  | Port/Area | New assumption | Trigger/Context | Validation Plan | Status | Notes |
| --- | --------- | -------------- | --------------- | --------------- | ------ | ----- |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior:
- Affected ports/adapters:
- Required TODO/PRD changes:

---

## Command — `deploy`

### Current assumptions

| ID      | Port/Area           | Assumption                                                                                                                         | Why Needed                                                                         | Validation Plan                                                                                    | Status    | Notes                                                                           |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------- |
| DPL-001 | deploy command flow | `deploy` can follow the same manifest-first pattern as `register`, reading `platform.yaml` from a directory or `cwd` by default    | Reuses existing manifest parsing/validation path and keeps CLI behavior consistent | Validate with CLI tests for default-path and explicit-directory flows                              | validated | Keeps deploy non-interactive in spike mode                                      |
| DPL-002 | deploy environments | A reduced environment set of `preview` and `production`, with `preview` as the default, is sufficient for the spike                | Keeps deploy scope small while still exercising command-specific behavior          | Validate with argument parsing tests, success-path tests, and assumptions review                   | validated | Additional environments can be added when real provider contracts are defined   |
| DPL-003 | stub deploy adapter | A deterministic in-memory stub is sufficient to validate deploy UX without simulating full rollout lifecycle                       | Avoids premature modeling of platform internals while proving the command surface  | Validate with unit tests for deterministic IDs, repeated deploys, and explicit failure fixtures    | validated | Stub must remain network-free and reset between instances                       |
| DPL-004 | error taxonomy      | `deploy` needs a command-specific typed failure (`DeploymentError`) rather than the shared deferred-command contract once promoted | Preserves actionable UX and stable exit semantics after command promotion          | Validate with CLI and adapter tests covering deploy-client failures                                | validated | Exit code 14; unique and documented in `EXIT_CODES`                             |
| DPL-005 | observability guard | Deploy telemetry can use the existing `ObservabilityClient` port and must remain best-effort and secret-safe                       | Avoids introducing a new observability boundary for one command                    | Validate with tests that simulate observability failure and assert deploy exit/result is unchanged | validated | Payloads exclude secrets; observability throw tested and confirmed non-blocking |

#### Unknowns

| ID      | Port/Area           | Unknown                                                                                       | Risk if Wrong | Decision Needed By                       | Owner    | Notes                                                                 |
| ------- | ------------------- | --------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------- |
| DPL-U01 | deploy receipt      | Whether the real platform will return only a deployment identifier or richer status metadata  | Medium        | Before replacing the stub adapter        | platform | Keep stub receipt minimal but extendable                              |
| DPL-U02 | environment mapping | Whether future deploy targets will use friendly names (`preview`) or provider-specific labels | Medium        | Before real deploy contract is finalized | platform | Normalize to CLI-facing names in spike; map later if provider differs |
| DPL-U03 | failure semantics   | Which provider failure classes deserve distinct typed errors beyond `DeploymentError`         | Medium        | Before production adapter implementation | platform | Spike keeps one typed deploy failure to avoid speculative taxonomy    |

#### Required adapter/provider capabilities

| ID      | Port/Area                 | Required capability (CLI-owned contract)                                                   | Source command behavior           | Priority    | Notes                                                            |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- | ----------- | ---------------------------------------------------------------- |
| DPL-C01 | deploy client             | `deploy(input) -> receipt` with normalized `DeploymentError` failures                      | `universe deploy` success path    | must-have   | Input should include manifest and target environment             |
| DPL-C02 | project reader            | `readFile(filePath) -> manifestYaml`                                                       | Manifest lookup for deploy        | must-have   | Reuses existing `ProjectReaderPort` capability from `register`   |
| DPL-C03 | platform manifest service | `validateManifest(yaml) -> PlatformManifest`                                               | Manifest validation before deploy | must-have   | Reuses existing validation path                                  |
| DPL-C04 | observability client      | `track()` and `error()` remain non-blocking when deploy emits start/success/failure events | Deploy telemetry                  | should-have | Must preserve safe wrapper behavior already used by the CLI flow |

#### New assumptions discovered during implementation

| ID  | Port/Area | New assumption | Trigger/Context | Validation Plan | Status | Notes |
| --- | --------- | -------------- | --------------- | --------------- | ------ | ----- |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior: `universe deploy` argument model, success output, and failure mapping
- Affected ports/adapters: `DeployClient`, stub deploy adapter, manifest validation reuse, observability wrappers
- Required TODO/PRD changes: deploy TODO phase ordering, deploy error taxonomy, and migration notes for real adapter parity

---

## Command — `promote`

### Current assumptions

| ID      | Port/Area            | Assumption                                                                                                                         | Why Needed                                                                         | Validation Plan                                                                                     | Status    | Notes                                                                                |
| ------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| PRM-001 | promote command flow | `promote` can follow the same manifest-first pattern as `deploy`, reading `platform.yaml` from a directory or `cwd` by default     | Reuses existing manifest parsing/validation path and keeps CLI behavior consistent | Validate with CLI tests for default-path and explicit-directory promote flows                       | validated | Keeps promote non-interactive in spike mode                                          |
| PRM-002 | target environment   | A reduced promote target set with `production` as the default is sufficient for the spike                                          | Keeps scope small while exercising command-specific promotion behavior             | Validate with argument parsing tests, success-path tests, and assumptions review                    | validated | Additional target environments can be added when real provider contracts are defined |
| PRM-003 | stub promote adapter | A deterministic in-memory stub is sufficient to validate promote UX without simulating full release orchestration                  | Avoids premature modeling of provider internals while proving command shape        | Validate with unit tests for deterministic IDs, repeated promotes, and explicit failure fixtures    | validated | Stub must remain network-free and reset between instances                            |
| PRM-004 | error taxonomy       | `promote` needs a command-specific typed failure (`PromotionError`) rather than the shared deferred-command contract once promoted | Preserves actionable UX and stable exit semantics after command promotion          | Validate with CLI and adapter tests covering promote-client failures                                | validated | Exit code 15; unique and documented in `EXIT_CODES`                                  |
| PRM-005 | observability guard  | Promote telemetry can use the existing `ObservabilityClient` port and must remain best-effort and secret-safe                      | Avoids introducing a new observability boundary for one command                    | Validate with tests that simulate observability failure and assert promote exit/result is unchanged | validated | Payloads exclude secrets; observability throw tested and confirmed non-blocking      |

#### Unknowns

| ID      | Port/Area         | Unknown                                                                                                    | Risk if Wrong | Decision Needed By                        | Owner    | Notes                                                                 |
| ------- | ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------- | -------- | --------------------------------------------------------------------- |
| PRM-U01 | promote receipt   | Whether the real platform returns only a promotion identifier or richer metadata (release URL, timestamps) | Medium        | Before replacing the stub adapter         | platform | Keep stub receipt minimal but extendable                              |
| PRM-U02 | target mapping    | Whether future promotion targets will use friendly names (`production`) or provider-specific labels        | Medium        | Before real promote contract is finalized | platform | Normalize to CLI-facing names in spike; map later if provider differs |
| PRM-U03 | failure semantics | Which provider failure classes should become typed errors beyond `PromotionError`                          | Medium        | Before production adapter implementation  | platform | Spike keeps one typed promote failure to avoid speculative taxonomy   |

#### Required adapter/provider capabilities

| ID      | Port/Area                 | Required capability (CLI-owned contract)                                                    | Source command behavior            | Priority    | Notes                                                            |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | ----------- | ---------------------------------------------------------------- |
| PRM-C01 | promote client            | `promote(input) -> receipt` with normalized `PromotionError` failures                       | `universe promote` success path    | must-have   | Input should include manifest and target environment             |
| PRM-C02 | project reader            | `readFile(filePath) -> manifestYaml`                                                        | Manifest lookup for promote        | must-have   | Reuses existing `ProjectReaderPort` capability from `register`   |
| PRM-C03 | platform manifest service | `validateManifest(yaml) -> PlatformManifest`                                                | Manifest validation before promote | must-have   | Reuses existing validation path                                  |
| PRM-C04 | observability client      | `track()` and `error()` remain non-blocking when promote emits start/success/failure events | Promote telemetry                  | should-have | Must preserve safe wrapper behavior already used by the CLI flow |

#### New assumptions discovered during implementation

| ID  | Port/Area | New assumption | Trigger/Context | Validation Plan | Status | Notes |
| --- | --------- | -------------- | --------------- | --------------- | ------ | ----- |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior: `universe promote` argument model, success output, and failure mapping
- Affected ports/adapters: `PromoteClient`, stub promote adapter, manifest validation reuse, observability wrappers
- Required TODO/PRD changes: promote TODO phase ordering, promote error taxonomy, and migration notes for real adapter parity

---

## Command Template

### Command — `<name>`

#### Current assumptions

| ID       | Port/Area   | Assumption         | Why Needed                            | Validation Plan                                  | Status | Notes |
| -------- | ----------- | ------------------ | ------------------------------------- | ------------------------------------------------ | ------ | ----- |
| CMDX-001 | examplePort | Example assumption | Enables command behavior in stub mode | Validate against provider/API doc when available | open   |       |

#### Unknowns

| ID       | Port/Area   | Unknown                | Risk if Wrong | Decision Needed By        | Owner    | Notes |
| -------- | ----------- | ---------------------- | ------------- | ------------------------- | -------- | ----- |
| CMDX-U01 | examplePort | Example unknown detail | Medium        | Post-spike adapter design | platform |       |

#### Required adapter/provider capabilities

| ID       | Port/Area   | Required capability (CLI-owned contract)              | Source command behavior           | Priority  | Notes |
| -------- | ----------- | ----------------------------------------------------- | --------------------------------- | --------- | ----- |
| CMDX-C01 | examplePort | `createThing(input) -> result` with normalized errors | `universe <command>` success path | must-have |       |

#### New assumptions discovered during implementation

| ID       | Port/Area   | New assumption                      | Trigger/Context                | Validation Plan                                       | Status | Notes |
| -------- | ----------- | ----------------------------------- | ------------------------------ | ----------------------------------------------------- | ------ | ----- |
| CMDX-N01 | examplePort | Example newly discovered assumption | Found while handling edge case | Add contract test + validate with provider docs later | open   |       |

#### Validation evidence and outcomes

- Evidence links / artifacts:
  - [ ] Test(s):
  - [ ] Notes/docs:
  - [ ] Decision updates:
- ## Outcome summary:

#### Impact if assumptions changed

- Affected command behavior:
- Affected ports/adapters:
- Required TODO/PRD changes:

---

## Final Spike Review Checklist

- [ ] Every command or shared command-group section has a completed section in this register.
- [ ] Each command section includes current assumptions and newly discovered assumptions.
- [ ] Unknowns are either validated, deferred, or converted into explicit post-spike work.
- [ ] Required adapter/provider capabilities are defined per command or shared command group.
- [ ] Invalidated assumptions include impact and remediation notes.
