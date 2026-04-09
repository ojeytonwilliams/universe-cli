# Universe CLI — `create` Further Work TODO Plan

## Phase 1 — E2E Test Strategy Refactor

- [ ] CODE: Add combination-coverage unit tests to `LayerCompositionService` for every allowed runtime/framework/services combination
  - Acceptance:
    - Each allowed matrix entry is exercised as a `resolveLayers` call.
    - Tests assert the resolved layer names (not file content) for each combination.
    - No filesystem writes occur.

- [ ] CODE: Replace the exhaustive combination loop in `create.e2e.test.ts` with a small set of smoke tests
  - Acceptance:
    - 3 representative paths are tested: Node.js + Express + all services, Node.js + None + no services, Static.
    - The power-set loop is removed.
    - Existing snapshot, conflict, and deferred-command e2e tests are preserved unchanged.

## Phase 2 — YAML Config Serialisation

> ⚠️ **Dependency gate:** a YAML library must be installed before implementation. Ask for `pnpm add --save-exact yaml` before starting.

- [ ] CODE: Implement correct YAML parse and serialise in `LayerCompositionService`'s `parseConfig`/`stringifyConfig` methods
  - Acceptance:
    - `.yaml`/`.yml` files are parsed with a YAML parser, not `JSON.parse`.
    - `stringifyConfig` emits valid YAML (not JSON) for `.yaml`/`.yml` paths.
    - Merged YAML config files produce human-readable, valid YAML output.
    - Existing JSON round-trip behavior is unchanged.
    - Unit tests cover: YAML-only merge, JSON-only merge, and combined JSON+YAML resolution.

## Phase 3 — Layer Templating

- [ ] TASK: Define the template variable set and delimiter syntax for this phase
  - Acceptance:
    - Variables in scope are documented: project name, runtime, framework.
    - Chosen delimiter syntax (e.g. `{{name}}` vs `__NAME__`) is recorded in this file.
    - No engine dependency is required — simple string interpolation only.

- [ ] CODE: Implement a `LayerTemplateRenderer` internal service in `src/services/`
  - Acceptance:
    - The service accepts a template string and a typed context object; returns the rendered string.
    - Unit tests verify: all defined variables are substituted, unknown placeholders pass through unchanged, empty context is safe.

- [ ] CODE: Wire `LayerTemplateRenderer` into `LayerCompositionService` and remove post-hoc substitution from `cli.ts`
  - Acceptance:
    - Layer file content is rendered by `LayerTemplateRenderer` before being added to the composed file set.
    - `__PROJECT_NAME__` occurrences in the layer registry are replaced with the new delimiter syntax.
    - Post-hoc substitution code in `cli.ts` is removed.
    - E2E snapshot tests continue to pass after snapshot update.

## Phase 4 — `platform.yaml` Schema

> ⚠️ **Dependency gate:** Phase 2 must be complete (YAML serialiser needed).

- [ ] TASK: Define a versioned `PlatformManifest` TypeScript type covering both app and static shapes
  - Acceptance:
    - Type is defined in `src/services/` and includes a `schemaVersion` field.
    - App and static shapes are captured as a discriminated union.
    - Type documents the invariants from PRD FR-6.

- [ ] CODE: Refactor `PlatformManifestService` to build a typed `PlatformManifest` object and serialise to YAML via the Phase 2 implementation
  - Acceptance:
    - String template concatenation is removed from `PlatformManifestService`.
    - The service builds a typed object first, then emits YAML.
    - `schemaVersion` field appears in all generated `platform.yaml` files.
    - Existing E2E snapshot tests are updated to reflect the new field.

- [ ] CODE: Add manifest validation logic to `PlatformManifestService`
  - Acceptance:
    - Validation rejects manifests missing required fields.
    - Validation rejects manifests with an invalid or missing `schemaVersion`.
    - Unit tests cover: valid app manifest, valid static manifest, missing required field, unknown `schemaVersion`.
