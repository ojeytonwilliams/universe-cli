# Create Command Extension — Summary

## Project

- **Name:** universe-cli create extension
- **Type:** feature extension to existing spike
- **Primary user:** platform engineers scaffolding new projects via `universe create`

## Problem Statement

The `create` command scaffolds valid project files but leaves two gaps that every developer must resolve manually before the project is usable:

1. **Dependency management is insecure and inconvenient.** `package.json` uses exact pinned versions (`"express": "5.1.0"`) rather than major-version ranges, making minor/patch updates unnecessarily manual. No supply chain security artefacts (`.npmrc`, package manager enforcement) are generated, leaving the project open to dependency confusion, postinstall script attacks, and silent registry substitution.

2. **The project directory is not a git repository.** The developer must manually run `git init` and make an initial commit before the project integrates with any version control tooling.

## Goals

- Generated Node.js scaffolds use major-version dependency ranges (e.g. `"express": "^5"`) with a centralized version config for easy updates.
- Generated Node.js scaffolds include pnpm supply chain security artefacts (`.npmrc` hardening, `only-allow pnpm` enforcement).
- `universe create` runs `pnpm install` after file generation so the project is immediately usable.
- `universe create` runs `git init` and makes an initial commit for all scaffold types.
- Package manager and repo initialiser concerns sit behind ports so pnpm and git are not hard dependencies of the application layer.

## Non-Goals

- Supporting bun, yarn, or npm as package managers in this iteration (ports make it possible later).
- Configuring git user identity — developer's global git config is assumed to be set.
- Non-interactive package manager selection during `universe create`.
- Generating a lockfile without running `pnpm install` (lockfile is a product of the install step).
- Static scaffold pnpm integration — static projects have no Node.js dependencies.

## Constraints

- Must follow hexagonal architecture: `PackageManager` and `RepoInitialiser` are ports, not direct child-process calls in handlers.
- Dependency versions must be centralized in a single TypeScript config file — not scattered across layer files.
- pnpm security settings follow https://pnpm.io/supply-chain-security.
- If `pnpm install` or `git init` fail, the error must be typed and actionable; partial state must not be silently swallowed.

## Success Metrics

- `universe create` produces a directory where `pnpm install` has already run and `git log` shows one initial commit.
- All generated Node.js `package.json` files use `^major` ranges, not exact versions.
- Generated `.npmrc` includes `blockExoticSubdeps`, `minimumReleaseAge`, and `trustPolicy`.
- `preinstall` script enforces pnpm via `only-allow`.
- Changing a dependency version requires editing exactly one file (`dependency-versions.ts`).
- All new adapters have unit tests; integration tests cover the extended create flow.

## Open Questions & Assumptions

- **Assumption:** `pnpm` and `git` are available on the developer's PATH at `universe create` time. If either is absent, a typed error with an actionable message is thrown.
- **Assumption:** The initial git commit message is `"chore: initial commit"` (hardcoded in the adapter for now).
- **Assumption:** `docker-compose.dev.yml` should use `pnpm install && pnpm dev` instead of `npm install && npm dev`.
- **Assumption:** `dependency-versions.ts` holds major-version ranges (e.g. `"^5"`) as human-readable intent. After `pnpm install` runs, `package.json` is updated with the exact versions that pnpm resolved (e.g. `"5.1.2"`), extracted from the generated lockfile. The `minimumReleaseAge` setting in `.npmrc` ensures pnpm only resolves to versions at least 24 hours old.
- **Assumption:** `pnpm install` failure does **not** roll back the scaffold directory. Files are valid and the developer can re-run install manually. Rollback may be added in a future iteration based on feedback.
- **Open question:** Should the initial commit be optional via a `--no-git` flag? Deferred — make it optional in a future iteration based on developer feedback.
