# TODO — Create Extensibility: Framework Layers + Package Manager Selection (remaining)

Requirements reference: `plans/universe-cli/framework-package-manager-prd.md`

---

## Phase 4 — Integration stabilization and regression safety (FR-8, NFR-1)

- [ ] CODE: Expand create integration tests for manager/runtime/framework combinations
  - Feature: create flow coverage includes Node+typescript+pnpm, Node+express+pnpm, Node+typescript+bun, Static
  - Files: `src/integration-tests/create.test.ts`, `src/integration-tests/__snapshots__/create.test.ts.snap`, selection helpers in related tests if needed
  - Acceptance:
    - Integration scenarios assert correct package-manager service invocation for Node
    - Static scenario asserts no package-manager service invocation
    - Scaffold snapshots cover: `node`+`typescript`+`pnpm`, `node`+`express`+`pnpm`, `node`+`typescript`+`bun`, `static_web`+`none`
    - Snapshots are deterministic and updated
    - Tests are written first and initially fail, then pass after implementation

- [ ] TASK: Run full validation gate
  - Acceptance:
    - `pnpm test` passes
    - `pnpm lint` passes
    - `pnpm check` passes
