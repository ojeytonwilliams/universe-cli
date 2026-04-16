# Universe CLI — Copilot Instructions

## Workflow

If I ask you to continue

1. Find the next incomplete phase in `todo.md`
2. Find the first unchecked item in the incomplete phase
   - If it is a `CODE` item, see the TDD section below.
   - If it is a `TASK` item, it does not require tests even if it requires code or config.
3. Once the phase is complete create the CHANGELOG (see below) and commit. Each phase gets its own commit — never batch multiple phases into one.
4. Check:
   - If I have asked you to complete multiple phases (e.g. "Complete phases 2 and 3" or "Complete all remaining phases") go back to step 1 for the next phase
   - Otherwise stop and request my input.

## Skills to use (not exclusive)

Make sure to use `typescript-guidelines` when writing TypeScript or .tsx files and `typescript-test-guidelines` when writing tests or test.tsx files.

## TDD

Always write tests first when working on CODE: features. Once the tests have been written and shown (via `pnpm test`) to be failing, only then should you write the implementation. Write the implementation incrementally - write a small amount of code that should make one test pass, check that test passes and then repeat until all tests pass.

## CHANGELOG + version

Look at each of the phase's todo items. Mark them as checked if they have been completed. If any remain unchecked, implement those items before continuing.

Once all the phase's todo items are checked, run `pnpm test`, `pnpm lint` and `pnpm check`. Fix any errors before proceeding.

Once the checks are passing, increment the package.json version respecting semver. Then create a CHANGELOG.md entry with the new version and current date e.g. ## [1.2.3] - 2026-03-19. Populate the CHANGELOG.md entry by summarizing the features implemented in the phase.

Commit the changes with a conventional commit including an even briefer summary in the commit body.

## Commands

```sh
pnpm install             # install dependencies
pnpm test                # run all tests (Vitest)
pnpm lint                # run Oxlint
pnpm lint:fix            # run Oxlint with auto-fix
pnpm fmt                 # format with oxfmt
pnpm fmt:check           # check formatting without writing
pnpm check               # TypeScript type-check (no emit)
pnpm build               # compile to dist/
```

Run a single test file:

```sh
pnpm vitest run src/path/to/file.test.ts
```

Run tests matching a name pattern:

```sh
pnpm vitest run --reporter=verbose -t "pattern"
```

Global CLI install: `pnpm link --global` (makes `universe` available on PATH).

## Architecture

This is a **hexagonal (ports & adapters)** CLI. The layers are:

- **`src/cli.ts`** — Entry point: parses `argv`, dispatches to command handlers, handles `CliError`s, wraps observability calls.
- **`src/commands.ts`** — One `handle*` function per command. Accepts `Services` and `Adapters` bundles as deps. Returns `HandlerResult` (`{ exitCode, output, meta? }`).
- **`src/ports/`** — TypeScript interfaces only (no implementation). Each port is one interface file.
- **`src/adapters/`** — Implementations of ports. Real adapters (e.g., `local-filesystem-writer.ts`) plus `Stub*` adapters used in tests.
- **`src/services/`** — Pure domain logic: layer composition, platform manifest generation, input validation.
- **`src/errors/cli-errors.ts`** — All error classes extend `CliError` which carries a numeric `exitCode`. Handlers throw; `cli.ts` catches.
- **`src/bin.ts`** — Wires real adapters + stub network clients, calls `runCli`, writes stdout, sets `process.exitCode`.

The **`Services`** bundle contains: `layerResolver`, `platformManifestGenerator`, `validator`.  
The **`Adapters`** bundle contains all port implementations.

### `create` command flow

`promptForCreateInputs()` → `validateCreateInput()` → `resolveLayers()` → `generatePlatformManifest()` → `writeProject()` → optionally `specifyDeps()` + `install()` + `initialise()`.

### Layer composition system

`LayerCompositionService.resolveLayers()` composes ordered layers into a flat file map. Layers are applied in stage order: `always` → `base` → `package-managers` → `frameworks` → `services`. Config files (`.json`, `.yaml`, `.yml`) are deep-merged across stages; non-config files throw `LayerConflictError` on collision within the same stage. Template variables `{{name}}`, `{{runtime}}`, `{{framework}}` are substituted in all file contents.

### `platform.yaml`

Most commands other than `create` read a `platform.yaml` from the project directory and validate it via `PlatformManifestService.validateManifest()`. The schema is a Zod discriminated union on `stack: "app" | "static"`.

## Key Conventions

### TDD workflow

Write tests first. Run `pnpm test` to confirm they fail, then implement incrementally until they all pass. Never skip this order.

### Stub adapters

Each port has a corresponding `Stub*` adapter in `src/adapters/`. Stubs use a **sentinel fixture** pattern: a magic name (e.g., `"deploy-failure"`) triggers the error path. Integration tests consume these via `createAdapterStubs()` from `src/integration-tests/adapter-stubs.ts`.

### Error handling

All user-facing errors must extend `CliError` with the correct `EXIT_CODES` constant. `cli.ts` catches `CliError` and converts it to an output string + exit code — never let `CliError` subclasses propagate past the handler boundary unintentionally.

### TypeScript

Strict mode plus additional checks. Types for port contracts are inferred from Zod schemas (single source of truth in `platform-manifest-service.ts`). Use `as const satisfies` for label maps.

### Linting / formatting

Oxlint (`.oxlintrc.json`) + oxfmt (`.oxfmtrc.json`). Do not modify the lint config. Use `// oxlint-disable-next-line` sparingly. Pre-commit hook auto-fixes and formats staged files.

### Dependencies

All dependency versions are **pinned exactly** (no `^` or `~`). When requesting a new package, specify it as `pnpm add --save-exact <package>`.

### Versioning & changelog

After completing a phase, bump `package.json` version (semver), add a `CHANGELOG.md` entry with `## [x.y.z] - YYYY-MM-DD`, then commit with a conventional commit message. One commit per phase.
