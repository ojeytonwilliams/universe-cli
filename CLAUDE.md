# Universe CLI

## Project

The planning documents (PRD, summary and phased TODO) are in `design/prd.md`, `design/summary.md` and `design/todo.md` respectively.

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

## Commands

```sh
pnpm install         # install dependencies
pnpm test            # run Vitest
pnpm lint            # run Oxlint
pnpm lint:fix        # run Oxlint with auto-fix
pnpm fmt             # run oxfmt (format)
pnpm fmt:check       # check formatting without writing
```

Vitest globals are enabled — no need to import `describe`, `it`, `expect`.

The pre-commit hook runs `lint-staged`, which auto-fixes and formats staged JS/TS files via Oxlint and oxfmt.

## TypeScript configuration

Strict mode is on with additional checks see `tsconfig.json`.

## Linting

See `.oxlintrc.json`. Use disables sparingly. Do not modify the config.

## Skills to use

Make sure to use `typescript-guidelines` when writing TypeScript or .tsx files and `typescript-test-guidelines` when writing tests or test.tsx files.

## TDD

Always write tests first when working on CODE: features. Once the tests have been written and shown (via `pnpm test`) to be failing, only then should you write the implementation. Write the implementation incrementally - write a small amount of code that should make one test pass, check that test passes and then repeat until all tests pass.

## CHANGELOG + version

Look at each of the phase's todo items. Mark them as checked if they have been completed. If any remain unchecked, implement those items before continuing.

Once all the phase's todo items are checked, run `pnpm test`, `pnpm lint` and `pnpm check`. Fix any errors before proceeding.

Once the checks are passing, increment the package.json version respecting semver. Then create a CHANGELOG.md entry with the new version and current date e.g. ## [1.2.3] - 2026-03-19. Populate the CHANGELOG.md entry by summarizing the features implemented in the phase.

Commit the changes with a conventional commit including an even briefer summary in the commit body.

## Forbidden Behaviour

Do NOT look inside node_modules. To verify a package is installed, run `pnpm list <package-name>`.
Do NOT install packages. If you need something, ask me to install it for you.
Do not use the tdd-unit skill.
Do NOT look inside the dist folder.

## Missing Dependency Gate (Required)

If tests/lint/check fail due to missing dependencies:

1. **Stop and ask** for the exact install needed.
2. Include: (a) what is missing, (b) why it is required, and (c) the exact package/tool name(s).
3. **Do not pivot** to a different implementation approach to avoid the missing dependency unless the user explicitly declines installation.

## Dependencies

Always pin exact versions. For example, if you want me to install `nanostores` ask me to do
`pnpm add --save-exact nanostores @nanostores/react`

## OpenCode specific guidance

When editing large files, make sure not to delete everything after the part you're modifying. Make sure to use the "edit" tool, when updating and only use "write" when creating new files.
