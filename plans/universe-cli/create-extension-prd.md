# Create Command Extension — PRD

## Overview

This document extends `design/prd.md` with two new functional requirements: supply chain-secure dependency management and automatic repository initialisation. All existing requirements in `design/prd.md` remain in force.

---

## User Stories

| As a…             | I want to…                                                     | So that…                                                                   |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| platform engineer | scaffold a Node.js project with pnpm already installed         | I can run `pnpm dev` immediately without a manual install step             |
| platform engineer | have pnpm security settings generated in `pnpm-workspace.yaml` | I don't have to remember to configure supply chain protections myself      |
| platform engineer | see major-version ranges in `package.json`                     | I can apply minor and patch updates without touching the scaffold template |
| platform engineer | update all scaffolded dependency versions in one place         | A single file change propagates to every scaffold variant                  |
| platform engineer | scaffold a project that is already a git repository            | I can commit my first real change without a manual `git init`              |
| platform engineer | swap pnpm for another package manager in future                | The CLI is not hard-coupled to pnpm at the application layer               |

---

## FR-13 — Per-Layer Dependency Version Constants

Dependency version strings must not be hardcoded inline in layer objects. Each layer file owns its own version constants as named constants defined at the top of that file.

**Version ownership**

Each layer file declares only the versions relevant to that layer. For example, `frameworks-layer.ts` defines `EXPRESS_VERSION = "^5"`, and `base-node-js-typescript-layer.ts` defines `TYPESCRIPT_VERSION = "^5"`. There is no shared cross-layer version file: a future React layer would define its own `REACT_VERSION` without touching any Express-related file.

**Version strategy**

Version constants hold major-version ranges (e.g. `"^5"`) as human-readable intent. These ranges flow into the initial scaffold `package.json`. After `PackageManager.specifyDeps()` runs (FR-15), `package.json` is updated with the exact versions pnpm resolved from the registry, constrained by `minimumReleaseAge` in `pnpm-workspace.yaml`. The lockfile and `package.json` therefore agree on exact versions.

**Acceptance Criteria**

- Each layer file that references a version range defines a named constant at the top of that file (e.g. `const EXPRESS_VERSION = "^5"`).
- No cross-layer version constant sharing: adding a new framework layer requires no changes to any existing layer file's version constants.
- No inline version string literals remain anywhere in a layer object — all version references go through a named constant.
- Versions target current LTS/latest major releases at the time of implementation.
- After `PackageManager.specifyDeps()` completes, `package.json` contains exact resolved versions (e.g. `"5.1.2"`), not the original ranges.

---

## FR-14 — pnpm Supply Chain Security Artefacts

Every Node.js scaffold must include pnpm security hardening configuration and enforce pnpm-only usage. Static scaffolds receive an empty `pnpm-workspace.yaml` (workspace marker only) and no pnpm-specific scripts.

**Configuration location**

pnpm project settings belong in `pnpm-workspace.yaml`, not `.npmrc`. No `.npmrc` file is generated for any scaffold type.

**pnpm-workspace.yaml settings (Node.js only)**

The four security settings are written as top-level camelCase keys (pnpm v10 format):

```yaml
blockExoticSubdeps: true
minimumReleaseAge: 1440
trustPolicy: no-downgrade
engineStrict: true
```

**package.json scripts**

All scripts that invoke other scripts must use `pnpm run`, not `npm run`:

- `"dev": "pnpm run build && pnpm run start"`
- `"preinstall": "npx only-allow pnpm"` enforces pnpm as the only permitted package manager.

**Acceptance Criteria**

- `pnpm-workspace.yaml` for Node.js scaffolds contains `blockExoticSubdeps: true`, `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade`, and `engineStrict: true` as top-level keys.
- `pnpm-workspace.yaml` for Static scaffolds is an empty file (workspace root marker only; no security settings, since static has no pnpm-managed deps).
- No `.npmrc` file is generated for any scaffold type.
- Generated `package.json` includes `"preinstall": "npx only-allow pnpm"` in its `scripts`.
- The `dev` script uses `pnpm run build && pnpm run start`, not `npm run`.
- `docker-compose.dev.yml` uses `pnpm install && pnpm dev`.
- Integration test snapshots reflect the updated artefacts.

---

## FR-15 — PackageManager Port

Package manager operations must be abstracted behind a port so the application layer has no direct dependency on pnpm.

**Port contract**

```
PackageManager
  install(projectDirectory: string): Promise<void>
    - Installs dependencies declared in the project directory's package.json
    - After installation, updates package.json with the exact versions
      resolved by the package manager (replacing any range specifiers)
    - Throws PackageInstallError on failure
```

**Version pinning behavior**

`PnpmPackageManagerAdapter.specifyDeps()` performs three steps internally:

1. Runs `pnpm install --lockfile-only`, which resolves ranges to exact versions respecting `minimumReleaseAge` from `pnpm-workspace.yaml` and generates `pnpm-lock.yaml` without populating `node_modules`.
2. Reads the resolved exact versions of all direct dependencies via `pnpm list --json --depth=0 --lockfile-only`.
3. Overwrites the version fields in `package.json` with the exact resolved versions.

`PnpmPackageManagerAdapter.install()` then runs `pnpm install` to populate `node_modules` from the pinned `package.json`.

The result is a `package.json` and `pnpm-lock.yaml` that agree on exact versions. The initial git commit (FR-16) therefore captures exact versions in version control.

**Acceptance Criteria**

- `src/ports/package-manager.ts` exports the `PackageManager` interface with `specifyDeps` and `install` methods.
- `PackageInstallError` is a typed `CliError` subclass with a distinct exit code.
- `src/adapters/pnpm-package-manager-adapter.ts` implements `PackageManager` with `specifyDeps` (lockfile generation + version pinning) and `install` (node_modules population) as described above.
- Unit tests for `PnpmPackageManagerAdapter` verify that the correct commands are invoked in order, that `package.json` is updated with exact versions after `specifyDeps`, and that failures surface as `PackageInstallError`.
- The create handler calls `packageManager.specifyDeps(targetDirectory)` then `packageManager.install(targetDirectory)` for Node.js scaffolds only; static scaffolds skip both steps.
- `package.json` in a Node.js scaffold contains no range specifiers after `universe create` completes.

---

## FR-16 — RepoInitialiser Port

Repository initialisation must be abstracted behind a port so the application layer has no direct dependency on git.

**Port contract**

```
RepoInitialiser
  initialise(projectDirectory: string): Promise<void>
    - Runs git init, stages all files, and makes an initial commit
    - Commit message: "chore: initial commit"
    - Throws RepoInitialisationError on failure
```

**Acceptance Criteria**

- `src/ports/repo-initialiser.ts` exports the `RepoInitialiser` interface and `RepoInitialisationError`.
- `RepoInitialisationError` is a typed `CliError` subclass with a distinct exit code.
- `src/adapters/git-repo-initialiser-adapter.ts` implements `RepoInitialiser` by running `git init`, `git add .`, and `git commit -m "chore: initial commit"` in sequence.
- Unit tests for `GitRepoInitialiserAdapter` verify that the correct commands are invoked in order and that failures surface as `RepoInitialisationError`.
- `GitRepoInitialiserAdapter` is wired into `src/container.ts`; the spike-guard test is updated to include it.
- The create handler calls `repoInitialiser.initialise(targetDirectory)` for all scaffold types after `packageManager.install` completes (or is skipped for static).

---

## FR-17 — Extended Create Handler Flow

The `create` command handler must incorporate dependency installation and repository initialisation into its existing flow.

**Updated flow (Node.js scaffold)**

1. Prompt for inputs
2. Validate inputs
3. Resolve and compose layers
4. Generate `platform.yaml`
5. Write files via `FilesystemWriter`
6. Install dependencies via `PackageManager`
7. Initialise repository via `RepoInitialiser`

**Updated flow (Static scaffold)**

Steps 1–5 as above; step 6 is skipped; step 7 runs.

**Acceptance Criteria**

- `PackageManager` and `RepoInitialiser` are injected into the create handler via the existing `Adapters` dependency bag — not imported directly.
- Failure in step 6 throws `PackageInstallError` and does not proceed to step 7.
- Failure in step 7 throws `RepoInitialisationError`.
- The success output message is unchanged (the new steps are silent on success).
- Integration tests cover the full extended flow for both Node.js and Static scaffolds using inline test doubles for `PackageManager` and `RepoInitialiser`.

---

## Error Taxonomy Additions

Two new error types extend the existing taxonomy in `design/prd.md`:

| Error                     | Exit Code | Trigger                                       |
| ------------------------- | --------- | --------------------------------------------- |
| `PackageInstallError`     | TBD       | `pnpm install` fails in the project directory |
| `RepoInitialisationError` | TBD       | `git init` or `git commit` fails              |

Exit codes must be distinct from all existing codes defined in `design/prd.md`.

---

## Non-Functional Requirements

- `PnpmPackageManagerAdapter` and `GitRepoInitialiserAdapter` must not be called in any unit test that does not explicitly test those adapters — inline test doubles are used everywhere else.
- No new direct dependency on `child_process` in the application layer (`src/commands.ts`, `src/cli.ts`).
- All version strings in generated scaffolds are sourced from `dependency-versions.ts` — no regression to hardcoded strings.

---

## Out of Scope

- bun, yarn, or npm package manager adapters (ports allow future addition).
- `--no-git` flag to skip repo initialisation (deferred pending feedback).
- `git config` management — developer's global config is assumed.
- Lockfile generation without running `pnpm install`.
- pnpm `allowedDeprecatedVersions` or `allowBuilds` configuration (can be added to `pnpm-workspace.yaml` later as trusted packages are identified).
