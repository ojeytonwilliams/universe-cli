# Universe CLI — Internal Services Refactor TODO

## Phase 1 — Refactor Plan and Target Boundaries

- [x] TASK: Document the target service boundaries for the create flow refactor
  - Acceptance:
    - The design names `DefaultCreateInputValidator`, `LocalLayerResolver`, and `LocalPlatformManifestGenerator` as internal services rather than adapters.
    - The replacement service names are recorded as `CreateInputValidationService`, `LayerCompositionService`, and `PlatformManifestService`.
    - The target folder for these implementations is recorded as `src/services/`.
    - The design states that `PromptPort`, `FilesystemWriter`, and `ObservabilityClient` remain ports because they are external boundaries.

- [x] TASK: Define the naming and import migration rules for the refactor
  - Acceptance:
    - Replacement class names are fixed as `CreateInputValidationService`, `LayerCompositionService`, and `PlatformManifestService` before code changes begin.
    - Imports from `src/adapters/` to the three selected classes are identified as migration points.
    - The plan states whether compatibility re-exports will be used temporarily or whether imports will be updated in one pass.

## Phase 2 — Move `DefaultCreateInputValidator` into `src/services`

- [x] CODE: Move create-input validation into an internal service
  - Feature: Convert `DefaultCreateInputValidator` into `CreateInputValidationService` under `src/services/`
  - Acceptance:
    - A new `CreateInputValidationService` implementation lives under `src/services/` and owns the create validation rules.
    - Runtime/framework/database/service compatibility checks continue to behave exactly as they do today.
    - Target-directory existence checks remain supported without reintroducing filesystem logic into `runCli()`.
    - Existing validation-focused tests are updated or replaced to target the new service location.

- [x] TASK: Remove adapter-oriented terminology from create-input validation docs and tests
  - Acceptance:
    - References describing the validator as an adapter are removed from affected design notes and test descriptions.
    - The updated wording describes validation as internal application logic.

## Phase 3 — Move `LocalLayerResolver` into `src/services`

- [x] CODE: Move layer composition and merge policy into an internal service
  - Feature: Convert `LocalLayerResolver` into `LayerCompositionService` under `src/services/`
  - Acceptance:
    - A new `LayerCompositionService` implementation lives under `src/services/` and owns layer ordering, conflict detection, and config merge behavior.
    - The default layer registry remains available to the create flow after the move.
    - Existing behavior for deterministic ordering, config merging, and conflict errors is preserved.
    - Existing resolver tests are updated or replaced to target the new service location.

- [x] TASK: Record the layer registry as internal scaffolding data rather than adapter configuration
  - Acceptance:
    - Design notes describe the registry as create-flow-owned data.
    - The plan makes clear that future templating or serialisation work extends an internal service, not a new adapter boundary.

## Phase 4 — Move `LocalPlatformManifestGenerator` into `src/services`

- [x] CODE: Move platform manifest construction into an internal service
  - Feature: Convert `LocalPlatformManifestGenerator` into `PlatformManifestService` under `src/services/`
  - Acceptance:
    - A new `PlatformManifestService` implementation lives under `src/services/` and owns runtime-specific manifest construction.
    - Current app and static manifest outputs remain unchanged unless a later schema task explicitly changes them.
    - Existing manifest-generator tests are updated or replaced to target the new service location.
    - Manifest generation remains injectable into `runCli()` only if that still improves test setup after the refactor.

- [x] TASK: Align future manifest work with the internal-service decision
  - Acceptance:
    - Design notes state that schema validation and serialisation will be implemented as internal services/helpers, not new ports/adapters.
    - Follow-on work for `platform.yaml` refers to service-level refactors instead of adapter additions.

## Phase 5 — Simplify Composition and Contracts

- [ ] CODE: Update create-flow composition to distinguish real ports from internal services
  - Feature: Refactor composition and type boundaries so `runCli()` and `bin.ts` reflect the new service-vs-port split
  - Acceptance:
    - External boundaries remain represented by ports for prompting, filesystem writes, and observability.
    - Internal services are imported from `src/services/` and no longer described as adapters in composition code.
    - Type names and constructor wiring clearly separate infrastructure dependencies from internal create-flow logic.
    - All affected tests pass with the new wiring.

- [ ] TASK: Delete the three port interfaces that no longer represent external boundaries
  - Acceptance:
    - `CreateInputValidator`, `LayerResolver`, and `PlatformManifestGenerator` port interfaces are deleted from `src/ports/`.
    - No remaining file or design note describes these abstractions as ports.
    - Tests that previously relied on these interfaces use the concrete service classes directly — no interface is needed because the services are pure logic with no infrastructure side-effects.

## Traceability Matrix

| Refactor goal                                            | Covered by                         |
| -------------------------------------------------------- | ---------------------------------- |
| Reclassify validator as internal logic                   | Phase 1, Phase 2                   |
| Reclassify layer resolution as internal logic            | Phase 1, Phase 3                   |
| Reclassify manifest generation as internal logic         | Phase 1, Phase 4                   |
| Preserve behavior while moving code into `src/services/` | Phase 2, Phase 3, Phase 4          |
| Keep only true external boundaries as ports              | Phase 1, Phase 5                   |
| Align design docs with the new architecture decision     | Phase 2, Phase 3, Phase 4, Phase 5 |
