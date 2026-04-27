# TODO

## Phase 1: Config Schema

- [x] TASK: Update `src/commands/create/layer-composition/layers/package-manager.json` — add `manifests` (array) and `lockfile` (string) to each PM entry; remove `devInstall` and `watchRebuild` from pnpm and bun entries

- [x] CODE: Update the TypeScript schema for package-manager layer entries
  - Feature: Add `manifests: z.array(z.string())` and `lockfile: z.string()` to the package-manager entry schema; remove `devInstall` and `watchRebuild` fields
  - Files: `src/commands/create/layer-composition/schemas/layers.ts`
  - Acceptance:
    - Schema accepts a pnpm entry with `manifests` and `lockfile` and rejects one that still contains `devInstall` or `watchRebuild`
    - Parsing the updated `package-manager.json` through the schema succeeds without errors
    - All existing schema tests pass

## Phase 2: Composition Service

- [x] CODE: Derive `devInstall` and `watchRebuild` from `manifests` and `lockfile` at composition time
  - Feature: In the layer composition service (or Dockerfile data builder), `devInstall` needs to be completed using mainfests and lockfile `COPY ${[...manifests, lockfile].join(' ')} ./\nRUN <package manager specific install>` and `watchRebuild` as `[...manifests, lockfile].map(f => ({ path: './' + f }))` — reading both from the config rather than from stored fields
  - Files: `src/commands/create/layer-composition/layer-composition-service.ts` (and any related Dockerfile template helpers)
  - Acceptance:
    - Generated `devInstall` for pnpm matches `"COPY package.json pnpm-lock.yaml ./\nRUN pnpm install"`
    - Generated `devInstall` for bun matches `"COPY package.json bun.lock ./\nRUN bun install"`
    - Generated `watchRebuild` for pnpm contains entries for both `./package.json` and `./pnpm-lock.yaml`
    - Generated `watchRebuild` for bun contains entries for both `./package.json` and `./bun.lock`
    - All existing layer composition and scaffold generation tests pass

## Phase 3: Docker Runner

- [x] CODE: Implement `runCmdForFiles` and `runCmdForStdout` in `docker-runner.ts`
  - Feature: Replace the bind-mount `runCmd` with two new functions. `runCmdForFiles` creates a container, copies each input file in via `docker cp`, starts the container and waits, copies each output file out via `docker cp`, then removes the container (always, via `finally`). `runCmdForStdout` does the same but returns the command's stdout instead of copying output files.
  - Files: `src/commands/create/package-manager/docker-runner.ts`
  - Acceptance:
    - `runCmdForFiles` copies each file in `inputs` into `/app/<filename>` before the container starts
    - `runCmdForFiles` copies each file in `outputs` from `/app/<filename>` to `cwd/<filename>` after the container exits
    - `runCmdForStdout` returns the container's stdout as a string
    - The container is removed in all cases, including on error
    - No `-v` bind-mount flag appears in any docker invocation
    - `runCmd` is removed

## Phase 4: Package Manager Classes

- [x] CODE: Update `pnpm-package-manager.ts` to use the new docker runner API
  - Feature: Replace `runCmd` calls with `runCmdForFiles` (inputs: `["package.json"]`, outputs: `["pnpm-lock.yaml"]`) for `installLockfileOnly`, and `runCmdForStdout` (inputs: `["package.json", "pnpm-lock.yaml"]`) for `list`. Source `lockfileName` in `createPackageSpecifier` from the config `lockfile` field rather than hardcoding it.
  - Files: `src/commands/create/package-manager/pnpm-package-manager.ts`
  - Acceptance:
    - `installLockfileOnly` writes `pnpm-lock.yaml` to `cwd` without bind-mounting the directory
    - `list` returns the JSON output of `pnpm list`
    - `lockfileName` passed to `createPackageSpecifier` matches the `lockfile` value in `package-manager.json`
    - `PnpmRunner` interface signatures are unchanged
    - All existing pnpm package manager tests pass

- [x] CODE: Update `bun-package-manager.ts` to use the new docker runner API
  - Feature: Replace `runCmd` calls with `runCmdForFiles` (inputs: `["package.json"]`, outputs: `["bun.lock"]`) for `installLockfileOnly`, and `runCmdForStdout` (inputs: `["package.json", "bun.lock"]`) for `list`. Source `lockfileName` in `createPackageSpecifier` from the config `lockfile` field rather than hardcoding it.
  - Files: `src/commands/create/package-manager/bun-package-manager.ts`
  - Acceptance:
    - `installLockfileOnly` writes `bun.lock` to `cwd` without bind-mounting the directory
    - `list` returns the output of `bun list`
    - `lockfileName` passed to `createPackageSpecifier` matches the `lockfile` value in `package-manager.json`
    - `BunRunner` interface signatures are unchanged
    - All existing bun package manager tests pass

---

## Traceability Matrix

| Requirement ID                                                     | TODO Item                                                        | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- | ------ |
| REQ-1: `manifests`/`lockfile` fields in config                     | Phase 1 / TASK: Update `package-manager.json`                    | mapped |
| REQ-1: `manifests`/`lockfile` fields in config                     | Phase 1 / CODE: Update TypeScript schema                         | mapped |
| REQ-2: `devInstall` and `watchRebuild` derived at composition time | Phase 2 / CODE: Derive `devInstall` and `watchRebuild`           | mapped |
| REQ-3: `lockfileName` sourced from config                          | Phase 4 / CODE: Update `pnpm-package-manager.ts`                 | mapped |
| REQ-3: `lockfileName` sourced from config                          | Phase 4 / CODE: Update `bun-package-manager.ts`                  | mapped |
| REQ-4: `runCmdForFiles` implementation                             | Phase 3 / CODE: Implement `runCmdForFiles` and `runCmdForStdout` | mapped |
| REQ-5: `runCmdForStdout` implementation                            | Phase 3 / CODE: Implement `runCmdForFiles` and `runCmdForStdout` | mapped |
| REQ-6: Remove `runCmd`                                             | Phase 3 / CODE: Implement `runCmdForFiles` and `runCmdForStdout` | mapped |
| REQ-7: pnpm `installLockfileOnly` uses `runCmdForFiles`            | Phase 4 / CODE: Update `pnpm-package-manager.ts`                 | mapped |
| REQ-8: pnpm `list` uses `runCmdForStdout`                          | Phase 4 / CODE: Update `pnpm-package-manager.ts`                 | mapped |
| REQ-9: bun `installLockfileOnly` uses `runCmdForFiles`             | Phase 4 / CODE: Update `bun-package-manager.ts`                  | mapped |
| REQ-10: bun `list` uses `runCmdForStdout`                          | Phase 4 / CODE: Update `bun-package-manager.ts`                  | mapped |
| NFR-1: No bind mounts                                              | Phase 3 / CODE: Implement `runCmdForFiles` and `runCmdForStdout` | mapped |
| NFR-2: Explicit over implicit                                      | Phase 1 / TASK + Phase 3 / CODE                                  | mapped |
| NFR-3: Config as single source of truth                            | Phase 1 / CODE + Phase 2 / CODE                                  | mapped |
