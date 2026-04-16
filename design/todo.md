# TODO — Ports/Adapters Reorganisation

Requirements reference: `design/prd.md`

---

## Phase 1: Migrate `platform/` domain

- [x] TASK: Move and rename platform client port and stub files into `src/platform/`
  - Move all 8 port files from `src/ports/` and all 8 stub implementation files + their test files from `src/adapters/` into `src/platform/`
  - Apply dot secondary extension renaming per the file map in `design/prd.md`
  - Stub class names are already correct (`StubDeployClient`, etc.) — no renames needed
  - Update all import paths in `src/commands.ts`, `src/integration-tests/adapter-stubs.ts`, and all integration test files that reference these ports or stubs
  - Verify `pnpm test` and `pnpm lint` pass

## Phase 2: Migrate `package-manager/` domain

- [x] TASK: Move and rename package manager port, adapters, stub, and service into `src/package-manager/`
  - Move `src/ports/package-manager.ts` → `src/package-manager/package-manager.port.ts`
  - Move `src/adapters/bun-package-manager-adapter.ts` → `src/package-manager/bun-package-manager.ts`; rename class `BunPackageManagerAdapter` → `BunPackageManager`
  - Move `src/adapters/pnpm-package-manager-adapter.ts` → `src/package-manager/pnpm-package-manager.ts`; rename class `PnpmPackageManagerAdapter` → `PnpmPackageManager`
  - Move `src/adapters/stub-package-manager-adapter.ts` → `src/package-manager/package-manager.stub.ts`; rename class `StubPackageManagerAdapter` → `StubPackageManager`
  - Move `src/services/package-manager-service.ts` → `src/package-manager/package-manager.service.ts`
  - Move all corresponding test files alongside their source files
  - Update all import paths in `src/commands.ts`, `src/bin.ts`, `src/integration-tests/adapter-stubs.ts`, and any other consumers
  - Verify `pnpm test` and `pnpm lint` pass

## Phase 3: Migrate `io/` domain

- [x] TASK: Move and rename IO ports, adapters, and stubs into `src/io/`
  - Move `src/ports/filesystem-writer.ts` → `src/io/filesystem-writer.port.ts` (interface name unchanged)
  - Move `src/adapters/local-filesystem-writer.ts` → `src/io/local-filesystem-writer.ts` (class name unchanged)
  - Move `src/ports/project-reader.ts` → `src/io/project-reader.port.ts` (interface name unchanged)
  - Move `src/adapters/local-project-reader.ts` → `src/io/local-project-reader.ts` (class name unchanged)
  - Move `src/ports/repo-initialiser.ts` → `src/io/repo-initialiser.port.ts` (interface name unchanged)
  - Move `src/adapters/git-repo-initialiser-adapter.ts` → `src/io/git-repo-initialiser.ts`; rename class `GitRepoInitialiserAdapter` → `GitRepoInitialiser`
  - Move `src/adapters/stub-repo-initialiser-adapter.ts` → `src/io/repo-initialiser.stub.ts`; rename class `StubRepoInitialiserAdapter` → `StubRepoInitialiser`
  - Move all corresponding test files alongside their source files
  - Update all import paths in `src/commands.ts`, `src/integration-tests/adapter-stubs.ts`, and any other consumers
  - Verify `pnpm test` and `pnpm lint` pass

## Phase 4: Migrate `prompt/` domain

- [x] TASK: Move and rename prompt port and adapter into `src/prompt/`
  - Move `src/ports/prompt.ts` → `src/prompt/prompt.port.ts` (exported types/constants unchanged)
  - Move `src/adapters/clack-prompt-adapter.ts` → `src/prompt/clack-prompt.ts`; rename class `ClackPromptAdapter` → `ClackPrompt`
  - Move corresponding test file alongside its source file
  - Update all import paths in `src/commands.ts` and any other consumers
  - Verify `pnpm test` and `pnpm lint` pass

## Phase 5: Migrate `observability/` domain

- [x] TASK: Move and rename observability port, safe base, and stub into `src/observability/`
  - Move `src/ports/observability-client.ts` → `src/observability/observability-client.port.ts` (interface name unchanged)
  - Move `src/adapters/base-safe-observability-client.ts` → `src/observability/safe-observability-client.ts` (class name unchanged)
  - Move `src/adapters/stub-observability-client.ts` → `src/observability/observability-client.stub.ts` (class name unchanged)
  - Move all corresponding test files alongside their source files
  - Update all import paths in `src/commands.ts`, `src/bin.ts`, `src/integration-tests/adapter-stubs.ts`, and any other consumers
  - Verify `pnpm test` and `pnpm lint` pass

## Phase 6: Remove legacy folders and verify

- [x] TASK: Delete now-empty `src/adapters/` and `src/ports/` directories
  - Confirm both directories are empty before deleting
  - Run `pnpm test`, `pnpm lint`, and `pnpm check`; fix any remaining issues
  - Confirm the directory structure matches the target layout in `design/prd.md`

---

## Traceability Matrix

| Requirement ID | TODO Item                                                                           | Status |
| -------------- | ----------------------------------------------------------------------------------- | ------ |
| REQ-1          | Phase 1 / TASK: Move and rename platform client port and stub files                 | mapped |
| REQ-2          | Phase 2 / TASK: Move and rename package manager port, adapters, stub, and service   | mapped |
| REQ-3          | Phase 3 / TASK: Move and rename IO ports, adapters, and stubs                       | mapped |
| REQ-4          | Phase 4 / TASK: Move and rename prompt port and adapter                             | mapped |
| REQ-5          | Phase 5 / TASK: Move and rename observability port, safe base, and stub             | mapped |
| REQ-6          | Phase 6 / TASK: Delete now-empty `src/adapters/` and `src/ports/` directories       | mapped |
| REQ-7          | Phase 1–5 / TASK: Update all import paths in consuming files after each domain move | mapped |
| NFR-1          | Phase 1–6 / TASK: Verify `pnpm test` and `pnpm lint` pass (repeated each phase)     | mapped |
| NFR-2          | Phase 1–5 / TASK: Apply dot secondary extension naming throughout                   | mapped |
| NFR-3          | Phase 2–4 / TASK: Rename classes to drop `-Adapter` suffix                          | mapped |
