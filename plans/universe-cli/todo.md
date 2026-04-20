# TODO

## Phase 1: Config foundation

- [x] TASK: Add `resolveJsonModule: true` to `tsconfig.json`

- [x] CODE: Create `allowed-layer-combinations.json`
  - Feature: JSON config at `src/commands/create/allowed-layer-combinations.json` encoding the allowed frameworks, databases, platform services, and package managers per runtime
  - Files: `src/commands/create/allowed-layer-combinations.json`
  - Acceptance:
    - File exists with `node` and `static_web` top-level keys
    - `node.frameworks` is `["typescript", "express", "none"]`
    - `node.databases` is `["postgresql", "redis", "none"]`
    - `node.platformServices` is `["auth", "email", "analytics", "none"]`
    - `node.packageManagers` is `["pnpm", "bun"]`
    - `static_web.frameworks` is `["react-vite", "none"]`
    - `static_web.databases` is `["none"]`
    - `static_web.platformServices` is `["none"]`
    - `static_web.packageManagers` is `[]`

- [x] CODE: Create Zod schema and loader module
  - Feature: TypeScript module at `src/commands/create/allowed-layer-combinations.ts` that parses `allowed-layer-combinations.json` with Zod and exports the validated result
  - Files: `src/commands/create/allowed-layer-combinations.ts`
  - Acceptance:
    - Exports `allowedCombinations` constant (parsed and validated config object)
    - Exports `RuntimeCombinations` type inferred from the Zod schema
    - Module throws a Zod error at import time if the JSON does not conform to the schema
    - `pnpm check` passes

## Phase 2: Refactor validation service

- [x] CODE: Drive `create-input-validation-service.ts` from config
  - Feature: Validation service reads allowed combinations from `allowedCombinations` instead of hardcoded `SUPPORTED_*` arrays; the separate `validateNodeSelections` and `validateStaticSelections` methods are unified into a single `validateRuntimeSelections(input, config: RuntimeCombinations)` method
  - Files: `src/commands/create/create-input-validation-service.ts`
  - Acceptance:
    - Constants `SUPPORTED_NODE_FRAMEWORKS`, `SUPPORTED_STATIC_FRAMEWORKS`, `SUPPORTED_NODE_DATABASES`, `SUPPORTED_NODE_SERVICES`, `SUPPORTED_NODE_PACKAGE_MANAGERS` are removed
    - Imports `DATABASE_OPTIONS`, `PACKAGE_MANAGER_OPTIONS`, `PLATFORM_SERVICE_OPTIONS` are removed (no longer needed)
    - Constants `NODE_RUNTIME` and `STATIC_RUNTIME` are removed
    - Methods `validateNodeSelections` and `validateStaticSelections` are removed and replaced by `validateRuntimeSelections(input, config: RuntimeCombinations)`
    - `validateRuntimeAndCombinations` looks up `allowedCombinations[input.runtime]`; throws `CreateUnsupportedRuntimeError` when the key is absent
    - Package manager rule: when `config.packageManagers.length > 0`, `input.packageManager` must be present and included in `config.packageManagers`; when `config.packageManagers.length === 0`, `input.packageManager` must be `undefined`
    - `pnpm test` passes

- [x] TASK: Remove config-data tests from `src/commands/create/create-input-validation-service.test.ts`
  - Remove `"accepts typescript framework for Node runtime"`
  - Remove `"accepts react-vite framework for static_web runtime"`
  - Remove `"rejects typescript framework for static_web runtime"`
  - Remove `"rejects express framework for static_web runtime"`
  - `pnpm test` passes with those four tests gone

## Phase 3: Refactor prompt

- [x] CODE: Drive `clack-prompt.ts` from config
  - Feature: Prompt reads framework, database, service, and package manager options from `allowedCombinations` at runtime instead of hardcoded arrays
  - Files: `src/commands/create/prompt/clack-prompt.ts`
  - Acceptance:
    - Constants `NODE_FRAMEWORK_OPTIONS`, `STATIC_FRAMEWORK_OPTIONS`, `NODE_DATABASE_OPTIONS`, `STATIC_DATABASE_OPTIONS`, `NODE_SERVICE_OPTIONS`, `STATIC_SERVICE_OPTIONS`, `NODE_PACKAGE_MANAGER_OPTIONS` are removed
    - `getFrameworkOptions`, `getDatabaseOptions`, `getServiceOptions` return `allowedCombinations[runtime].<field>` cast to the appropriate option type; return `[]` when the runtime key is absent
    - Package manager prompt is shown only when `allowedCombinations[runtime]?.packageManagers.length > 0` and is populated from `allowedCombinations[runtime].packageManagers`
    - Any `FRAMEWORK_OPTIONS.*` references that were only used to populate the now-deleted arrays are removed
    - `pnpm test` passes

- [x] TASK: Remove config-data tests from `src/commands/create/prompt/clack-prompt.test.ts`
  - Remove `"filters framework options for Static runtime"`
  - Remove `"includes TypeScript in framework options for Node runtime"`
  - `pnpm test` passes with those two tests gone

## Phase 4: Update skill

- [x] TASK: Update `add-framework` skill to reflect the config-driven workflow
  - Edit `.claude/skills/add-framework/SKILL.md`
  - Replace the current Step 6 (edit `create-input-validation-service.ts` and add acceptance test) with: add the new framework key to the appropriate runtime's `"frameworks"` array in `src/commands/create/allowed-layer-combinations.json`
  - Renumber Step 7 (Verify) accordingly
  - Update the frontmatter `description` to remove mention of `create-input-validation-service.ts`
  - Update the constraints section: the only files that need changing when adding a framework are `allowed-layer-combinations.json`, `frameworks-layer.ts`, and `prompt.port.ts`

---

## Traceability Matrix

| Requirement ID | TODO Item                                                                               | Status |
| -------------- | --------------------------------------------------------------------------------------- | ------ |
| REQ-1          | Phase 1 / TASK: Add `resolveJsonModule: true` to `tsconfig.json`                        | mapped |
| REQ-2          | Phase 1 / CODE: Create `allowed-layer-combinations.json`                                | mapped |
| REQ-3          | Phase 1 / CODE: Create Zod schema and loader module                                     | mapped |
| REQ-4          | Phase 2 / CODE: Drive `create-input-validation-service.ts` from config                  | mapped |
| REQ-5          | Phase 3 / CODE: Drive `clack-prompt.ts` from config                                     | mapped |
| REQ-6          | Phase 3 / TASK: Remove config-data tests from `clack-prompt.test.ts`                    | mapped |
| REQ-7          | Phase 2 / TASK: Remove config-data tests from `create-input-validation-service.test.ts` | mapped |
| REQ-8          | Phase 4 / TASK: Update `add-framework` skill                                            | mapped |
| NFR-1          | Phase 1 / CODE: Create Zod schema and loader module                                     | mapped |
| NFR-2          | Phase 1 / CODE: Create Zod schema and loader module                                     | mapped |
| NFR-3          | (out of scope — `prompt.port.ts` unchanged throughout)                                  | mapped |
